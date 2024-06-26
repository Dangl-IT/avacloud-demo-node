import {
  GaebConversionApi,
  FileParameter,
  ProjectDto,
  IElementDto,
  ServiceSpecificationGroupDto,
  AvaConversionApi
} from '@dangl/avacloud-client-fetch';
import { readFileSync, writeFileSync } from 'fs';
import { getOAuth2AccessToken } from './utils';

const clientId = "YourClientId";
const clientSecret = "YourClientSecret";
const identityTokenUrl = 'https://identity.dangl-it.com/connect/token';
const avacloudBaseUrl = 'https://avacloud-api.dangl-it.com';

const gaebInputFile = 'GAEBXML_EN.X86';
let accessToken: string;

// App main entry point
(async () => {
  accessToken = await getOAuth2AccessToken(clientId, clientSecret, identityTokenUrl);
  await executeAvaCloudExample();
})();

async function executeAvaCloudExample() {
  if (!accessToken) {
    console.log('No access token, exiting app.');
    return;
  }

  await transformGaebToExcel();
  await printProjectTotalPriceAndPositionCount();
  await createNewGaebFile();
  await roundtripExampleGaebFile();
}

function getGaebFile(): FileParameter {
  const gaebFileBuffer = readFileSync(gaebInputFile);
  const fileParam: FileParameter = {
    data: new Blob([gaebFileBuffer]),
    fileName: 'GAEBXML_EN.X86',
  };
  return fileParam;
}

async function roundtripExampleGaebFile() {
  console.log(
    'Converting sample GAEB file to AVA Project then back again to new GAEB file...'
  );
  const gaebConversionClient = new GaebConversionApi();
  gaebConversionClient.accessToken = accessToken;
  gaebConversionClient.basePath = avacloudBaseUrl;
  const fileParam = getGaebFile();
  const conversionResult =
    await gaebConversionClient.gaebConversionConvertToAva(fileParam);
  const avaConversionClient = new AvaConversionApi();
  avaConversionClient.accessToken = accessToken;
  avaConversionClient.basePath = avacloudBaseUrl;
  const roundtrippedResult =
    await avaConversionClient.avaConversionConvertToGaeb(conversionResult.result);
  console.log('Saving GAEB conversion result to: Roundtrip.X86');
  const buffer = await roundtrippedResult.result.data.arrayBuffer();
  writeFileSync('Roundtrip.X86', new Uint8Array(buffer));
}

async function transformGaebToExcel() {
  console.log('Transforming GAEB file to Excel...');
  const gaebConversionClient = new GaebConversionApi();
  gaebConversionClient.accessToken = accessToken;
  gaebConversionClient.basePath = avacloudBaseUrl;
  const fileParam = getGaebFile();
  const conversionResult =
    await gaebConversionClient.gaebConversionConvertToExcel(
      fileParam,
      true,
      true,
      true,
      'de'
    );
  console.log('Saving Excel conversion result to:');
  console.log(gaebInputFile + '.xlsx');
  const buffer = await conversionResult.result.data.arrayBuffer();
  writeFileSync(gaebInputFile + '.xlsx', new Uint8Array(buffer));
}

async function printProjectTotalPriceAndPositionCount() {
  console.log('Transforming GAEB file to AVA Project...');
  const gaebConversionClient = new GaebConversionApi();
  gaebConversionClient.accessToken = accessToken;
  gaebConversionClient.basePath = avacloudBaseUrl;
  const fileParam = getGaebFile();
  // The avaProject variable is of type ProjectDto and contains the unified project model
  const avaProject = (
    await gaebConversionClient.gaebConversionConvertToAva(fileParam)
  ).result;
  const totalPrice = getProjectTotalPrice(avaProject);
  console.log('Project total price (net): ' + totalPrice);
  const countOfPositions = getProjectPositionCount(avaProject);
  console.log('Count of positions: ' + countOfPositions);
}

function getProjectTotalPrice(project: ProjectDto): number {
  if (project.serviceSpecifications) {
    return project.serviceSpecifications[0].totalPrice;
  }
  return 0;
}

function getProjectPositionCount(project: ProjectDto): number {
  if (project.serviceSpecifications) {
    const servSpec = project.serviceSpecifications[0];
    if (servSpec.elements) {
      const positionsCount = getPositionsInElementList(servSpec.elements);
      return positionsCount;
    }
  }
  return 0;
}

function getPositionsInElementList(elements: IElementDto[]): number {
  let positionsCount = 0;
  elements.forEach((element) => {
    if (element.elementTypeDiscriminator === 'PositionDto') {
      positionsCount++;
    } else if (
      element.elementTypeDiscriminator === 'ServiceSpecificationGroupDto'
    ) {
      const group = <ServiceSpecificationGroupDto>element;
      if (group.elements) {
        positionsCount += getPositionsInElementList(group.elements);
      }
    }
  });
  return positionsCount;
}

async function createNewGaebFile() {
  const avaConversionApi = new AvaConversionApi();
  avaConversionApi.accessToken = accessToken;
  avaConversionApi.basePath = avacloudBaseUrl;

  const avaProject = {
    serviceSpecifications: [
      {
        elements: [
          {
            elementTypeDiscriminator: 'PositionDto',
            shortText: 'Concrete Wall',
            unitTag: 'm²',
            quantityComponents: [
              {
                formula: '10'
              }
            ],
            priceComponents: [
              {
                values: [
                  {
                    formula: '80'
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  };

  const gaebCreationResponse =
    await avaConversionApi.avaConversionConvertToGaeb(
      <ProjectDto>(<any>avaProject)
    );
  const buffer = await gaebCreationResponse.result.data.arrayBuffer();
  writeFileSync('CreatedGaebFile.X86', new Uint8Array(buffer));
}

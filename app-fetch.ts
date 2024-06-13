import {
  GaebConversionClient,
  FileParameter,
  ProjectDto,
  IElementDto,
  PositionDto,
  ServiceSpecificationGroupDto,
  AvaConversionClient
} from '@dangl/avacloud-client-fetch';
import { readFileSync, writeFileSync } from 'fs';
import { getOAuth2AccessToken } from './utils';

const clientId = 'InsertYourClientId';
const clientSecret = 'InsertYourClientSecret';
const identityTokenUrl = 'https://identity.dangl-it.com/connect/token';
const avacloudBaseUrl = 'https://avacloud-api.dangl-it.com';

const gaebInputFile = 'GAEBXML_EN.X86';
let accessToken: string;

// App main entry point
(async () => {
  accessToken = await getOAuth2AccessToken(clientId, clientSecret, identityTokenUrl);
  await executeAvaCloudExample();
})();

const httpWithAuthentication = {
  fetch: (url: string, init?: RequestInit) => {
    init = init || {};
    init.headers = init.headers || {};
    // We're adding the accessToken as Bearer header value
    init.headers['Authorization'] = 'Bearer ' + accessToken;
    return fetch(url, init);
  }
};

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
    fileName: 'GAEBXML_EN.X86'
  };
  return fileParam;
}

async function roundtripExampleGaebFile() {
  console.log(
    'Converting sample GAEB file to AVA Project then back again to new GAEB file...'
  );

  const gaebConversionClient = new GaebConversionClient(
    avacloudBaseUrl,
    httpWithAuthentication
  );
  const fileParam = getGaebFile();
  const conversionResult =
    await gaebConversionClient.convertToAvaWithRequestObject(fileParam);
  const avaConversionClient = new AvaConversionClient(
    avacloudBaseUrl,
    httpWithAuthentication
  );
  const roundtrippedResult =
    await avaConversionClient.convertToGaebWithRequestObject(conversionResult);
  console.log('Saving GAEB conversion result to: Roundtrip.X86');
  writeFileSync(
    'Roundtrip.X86',
    Buffer.from(await roundtrippedResult.data.arrayBuffer())
  );
}

async function transformGaebToExcel() {
  console.log('Transforming GAEB file to Excel...');
  const gaebConversionClient = new GaebConversionClient(
    avacloudBaseUrl,
    httpWithAuthentication
  );
  const fileParam = getGaebFile();
  const conversionResult =
    await gaebConversionClient.convertToExcelWithRequestObject(fileParam, {
      conversionCulture: 'de'
    });
  writeFileSync(
    gaebInputFile + '.xlsx',
    Buffer.from(await conversionResult.data.arrayBuffer())
  );
}

async function printProjectTotalPriceAndPositionCount() {
  console.log('Transforming GAEB file to AVA Project...');
  const gaebConversionClient = new GaebConversionClient(
    avacloudBaseUrl,
    httpWithAuthentication
  );
  const fileParam = getGaebFile();
  // The avaProject variable is of type ProjectDto and contains the unified project model
  const avaProject = await gaebConversionClient.convertToAvaWithRequestObject(
    fileParam
  );
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
    if (element instanceof PositionDto) {
      positionsCount++;
    } else if (element instanceof ServiceSpecificationGroupDto) {
      if (element.elements) {
        positionsCount += getPositionsInElementList(element.elements);
      }
    }
  });
  return positionsCount;
}

async function createNewGaebFile() {
  const avaConversionClient = new AvaConversionClient(
    avacloudBaseUrl,
    httpWithAuthentication
  );

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
    await avaConversionClient.convertToGaebWithRequestObject(
      <ProjectDto>(<any>avaProject)
    );
  writeFileSync(
    'CreatedGaebFile.X86',
    Buffer.from(await gaebCreationResponse.data.arrayBuffer())
  );
}

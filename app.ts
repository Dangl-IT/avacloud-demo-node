import {
  GaebConversionApi,
  FileParameter,
  ProjectDto,
  IElementDto,
  PositionDto,
  ServiceSpecificationGroupDto,
  AvaConversionApi
} from '@dangl/avacloud-client-node';
import { readFileSync, writeFileSync } from 'fs';
import { post } from 'request';

const clientId = 'InsertYourClientId';
const clientSecret = 'InsertYourClientSecret';
const identityTokenUrl = 'https://identity.dangl-it.com/connect/token';
const avacloudBaseUrl = 'https://avacloud-api.dangl-it.com';

const gaebInputFile = 'GAEBXML_EN.X86';
let accessToken: string;

// App main entry point
(async () => {
  await getOAuth2AccessToken();
  await executeAvaCloudExample();
})();

async function getOAuth2AccessToken(): Promise<void> {
  if (!clientId || !clientSecret) {
    console.log('Please provide values for clientId and clientSecret. You can find more info in the tutorial at www.dangl-it.com or the AVACloud documenation.');
    return;
  }
  const clientCredentialsRequest = new Promise(function (resolve, reject) {
    post(identityTokenUrl, {
      auth: {
        username: clientId,
        password: clientSecret
      },
      body: 'grant_type=client_credentials&scope=avacloud',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }, function (err, resp, body) {
      if (err) {
        console.log('Error');
        reject(err);
      } else {
        resolve(body);
      }
    });
  });
  try {
    const clientCredentialsResult = await clientCredentialsRequest;
    accessToken = JSON.parse(<string>clientCredentialsResult)['access_token'];
    if (!accessToken) {
      console.log('Failed to obtain an access token. Have you read the documentation and set up your OAuth2 client?');
    }
  } catch {
    console.log('Failed to obtain an access token. Have you read the documentation and set up your OAuth2 client?');
  }
}

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
    value: gaebFileBuffer,
    options: {
      filename: 'GAEBXML_EN.X86',
      contentType: 'application/octet-stream'
    }
  };
  return fileParam;
}

async function roundtripExampleGaebFile() {
  console.log('Converting sample GAEB file to AVA Project then back again to new GAEB file...');
  const gaebConversionClient = new GaebConversionApi();
  gaebConversionClient.accessToken = accessToken;
  gaebConversionClient.basePath = avacloudBaseUrl;
  const fileParam = getGaebFile();
  const conversionResult = await gaebConversionClient.gaebConversionConvertToAva(fileParam);
  const avaConversionClient = new AvaConversionApi();
  avaConversionClient.accessToken = accessToken;
  avaConversionClient.basePath = avacloudBaseUrl;
  const roundtrippedResult = await avaConversionClient.avaConversionConvertToGaeb(conversionResult.body);
  console.log('Saving GAEB conversion result to: Roundtrip.X86');
  writeFileSync('Roundtrip.X86', roundtrippedResult.body);
}


async function transformGaebToExcel() {
  console.log('Transforming GAEB file to Excel...');
  const gaebConversionClient = new GaebConversionApi();
  gaebConversionClient.accessToken = accessToken;
  gaebConversionClient.basePath = avacloudBaseUrl;
  const fileParam = getGaebFile();
  const conversionResult = await gaebConversionClient.gaebConversionConvertToExcel(fileParam, true, true, 'de');
  console.log('Saving Excel conversion result to:');
  console.log(gaebInputFile + '.xlsx');
  writeFileSync(gaebInputFile + '.xlsx', conversionResult.body);
}

async function printProjectTotalPriceAndPositionCount() {
  console.log('Transforming GAEB file to AVA Project...');
  const gaebConversionClient = new GaebConversionApi();
  gaebConversionClient.accessToken = accessToken;
  gaebConversionClient.basePath = avacloudBaseUrl;
  const fileParam = getGaebFile();
  // The avaProject variable is of type ProjectDto and contains the unified project model
  const avaProject = (await gaebConversionClient.gaebConversionConvertToAva(fileParam)).body;
  const totalPrice = getProjectTotalPrice(avaProject);
  console.log('Project total price (net): ' + totalPrice);
  const countOfPositions = getProjectPositionCount(avaProject);
  console.log('Count of positions: ' + countOfPositions);
}

function getProjectTotalPrice(project: ProjectDto): number {
  if (project.serviceSpecifications) {
    return project
      .serviceSpecifications[0]
      .totalPrice;
  }
  return 0;
}

function getProjectPositionCount(project: ProjectDto): number {
  if (project.serviceSpecifications) {
    const servSpec = project
      .serviceSpecifications[0];
    if (servSpec.elements) {
      const positionsCount = getPositionsInElementList(servSpec.elements);
      return positionsCount;
    }
  }
  return 0;
}

function getPositionsInElementList(elements: IElementDto[]): number {
  let positionsCount = 0;
  elements.forEach(element => {
    if (element.elementTypeDiscriminator === 'PositionDto') {
      positionsCount++;
    } else if (element.elementTypeDiscriminator === 'ServiceSpecificationGroupDto') {
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

  const gaebCreationResponse = await avaConversionApi.avaConversionConvertToGaeb(<ProjectDto><any>avaProject);
  writeFileSync('CreatedGaebFile.X86', gaebCreationResponse.body);
}

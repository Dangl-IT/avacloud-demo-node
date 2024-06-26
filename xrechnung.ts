import {
  Invoice,
  XRechnungConversionApi,
  FileParameter,
  InvoiceType,
  AvaProjectWrapper,
  SourceType,
  Organization,
  InvoiceTotals,
} from "@dangl/avacloud-client-fetch";
import { readFileSync, writeFileSync } from "fs";

import { getOAuth2AccessToken } from "./utils";

const clientId = "YourClientId";
const clientSecret = "YourClientSecret";
const identityTokenUrl = "https://identity.dangl-it.com/connect/token";
const avacloudBaseUrl = "https://avacloud-api.dangl-it.com";

let accessToken: string;

// App main entry point
(async () => {
  accessToken = await getOAuth2AccessToken(
    clientId,
    clientSecret,
    identityTokenUrl
  );
  await executeAvaCloudXRechnungExample();
})();

async function executeAvaCloudXRechnungExample() {
  if (!accessToken) {
    console.log("No access token, exiting app.");
    return;
  }

  await createXRechnungFromInvoice();
  await createXRechnungFromAvaWrapper();
  await convertXRechnungToInvoice();
  await convertXRechnungToAvaWrapper();
}

async function createXRechnungFromInvoice() {
  console.log("Creating XRechnung from Invoice...");

  const xrechnungConversionClient = new XRechnungConversionApi();
  xrechnungConversionClient.accessToken = accessToken;
  xrechnungConversionClient.basePath = avacloudBaseUrl;

  const sourceInvoice =new Invoice({
    sourceType: SourceType.Self,
    invoiceNumber: "12-34/2024",
    buyer: new Organization({
      name: "Dangl IT GmbH",
    }),
    totals: new InvoiceTotals({
      totalNet: 100,
    }),
  });

  const conversionResult =
    await xrechnungConversionClient.xRechnungConversionConvertInvoiceToXRechnung(
      sourceInvoice
    );

  console.log("Saving XRechnung creation result to: XRechnung.xml");
  const buffer = await conversionResult.result.data.arrayBuffer();
  writeFileSync("XRechnung.xml", new Uint8Array(buffer));
}

async function createXRechnungFromAvaWrapper() {
  console.log("Creating XRechnung from AVA Wrapper...");

  const xrechnungConversionClient = new XRechnungConversionApi();
  xrechnungConversionClient.accessToken = accessToken;
  xrechnungConversionClient.basePath = avacloudBaseUrl;

  const project = {
    projectInformation: {
      buyer: {
        name: "Dangl IT GmbH",
      },
    },
    serviceSpecifications: [
      {
        elements: [
          {
            elementTypeDiscriminator: "PositionDto",
            shortText: "Fridge",
            unitTag: "pcs",
            quantityOverride: 1,
            unitPriceOverride: 299.95,
          },
        ],
      },
    ],
  };
  const sourceAvaWrapper = {
    invoiceNumber: "12-34/2024",
    invoiceType: InvoiceType.CommercialInvoice,
    project: project,
  };

  const conversionResult =
    await xrechnungConversionClient.xRechnungConversionConvertAvaToXRechnung(
      <AvaProjectWrapper><any>sourceAvaWrapper
    );

  console.log("Saving XRechnung creation result to: XRechnungFromAva.xml");
  const buffer = await conversionResult.result.data.arrayBuffer();
  writeFileSync("XRechnungFromAva.xml", new Uint8Array(buffer));
}

async function convertXRechnungToInvoice() {
  console.log("Converting XRechnung to Invoice...");
  const xrechnungConversionClient = new XRechnungConversionApi();
  xrechnungConversionClient.accessToken = accessToken;
  xrechnungConversionClient.basePath = avacloudBaseUrl;
  const fileParam = getXRechnungFile();
  const invoice = (
    await xrechnungConversionClient.xRechnungConversionConvertXRechnungToInvoice(
      fileParam
    )
  ).result;

  console.log("Total price from invoice: " + invoice.totals?.totalNet);
}

async function convertXRechnungToAvaWrapper() {
  console.log("Converting XRechnung to AVA Wrapper...");
  const xrechnungConversionClient = new XRechnungConversionApi();
  xrechnungConversionClient.accessToken = accessToken;
  xrechnungConversionClient.basePath = avacloudBaseUrl;
  const fileParam = getXRechnungFile();
  const avaWrapper = (
    await xrechnungConversionClient.xRechnungConversionConvertXRechnungToAva(
      fileParam
    )
  ).result;

  console.log(
    "Total price from wrapper: " +
      avaWrapper.project.serviceSpecifications![0].totalPrice
  );
}

function getXRechnungFile(): FileParameter {
  const gaebFileBuffer = readFileSync("UblXRechnungSample.xml");
  const fileParam: FileParameter = {
    data: new Blob([gaebFileBuffer]),
    fileName: "UblXRechnungSample.xml",
  };
  return fileParam;
}

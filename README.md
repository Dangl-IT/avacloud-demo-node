# avacloud-demo-node

[**AVA**Cloud](https://www.dangl-it.com/products/avacloud-gaeb-saas/) is a web based Software as a Service (SaaS) offering for [GAEB files](https://www.dangl-it.com/articles/what-is-gaeb/).  
The GAEB standard is a widely used format to exchange tenderings, bills of quantities and contracts both in the construction industry and in regular commerce. **AVA**Cloud uses the [GAEB & AVA .Net Libraries](https://www.dangl-it.com/products/gaeb-ava-net-library/) and makes them available to virtually all programming frameworks via a web service.

This project here contains example code in TypeScript / JavaScript for the NodeJS runtime to read and convert GAEB files. The client code is generated from the [**AVA**Cloud Swagger Specification](https://avacloud-api.dangl-it.com/swagger-internal).

## Step-By-Step Tutorial

[Please find here a step-by-step tutorial how to use the Node client.](https://www.dangl-it.com/articles/create-edit-and-convert-gaeb-files-in-node-with-javascript-and-the-avacloud-api/)

## Build

Execute the following command in the root directory of the project:

    npm i
    npm run build

## Run

Execute the following command in the root directory of the project:

    npm run start

At the top of the `app.ts` file, the following parameters must be defined by you:

    const clientId = 'InsertYourClientId';
    const clientSecret = 'InsertYourClientSecret';

These are the credentials of your [**Dangl.Identity**](https://identity.dangl-it.com) OAuth2 client that is configured to access **AVA**Cloud.  
If you don't have values for `ClientId` and `ClientSecret` yet, you can [check out the documentation](https://docs.dangl-it.com/Projects/AVACloud/latest/howto/registration/developer_signup.html) for instructions on how to register for **AVA**Cloud and create an OAuth2 client.

This example app does two operations:

1. The local GAEB file is transformed to Excel and saved next to the input file
2. The local GAEB file is converted to the unified **Dangl.AVA** format and the total price as well as the number of positions in the bill of quantities is printed to the console.

---
[License](./LICENSE.md)

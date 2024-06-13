import { post } from "request";

export async function getOAuth2AccessToken(
  clientId: string,
  clientSecret: string,
  identityTokenUrl: string
): Promise<string> {
  if (!clientId || !clientSecret) {
    console.log(
      "Please provide values for clientId and clientSecret. You can find more info in the tutorial at www.dangl-it.com or the AVACloud documenation."
    );
    throw new Error("Missing clientId or clientSecret");
  }
  const clientCredentialsRequest = new Promise(function (resolve, reject) {
    post(
      identityTokenUrl,
      {
        auth: {
          username: clientId,
          password: clientSecret,
        },
        body: "grant_type=client_credentials&scope=avacloud",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
      function (err, resp, body) {
        if (err) {
          console.log("Error");
          reject(err);
        } else {
          resolve(body);
        }
      }
    );
  });
  try {
    const clientCredentialsResult = await clientCredentialsRequest;
    const accessToken = JSON.parse(<string>clientCredentialsResult)[
      "access_token"
    ];
    if (!accessToken) {
      console.log(
        "Failed to obtain an access token. Have you read the documentation and set up your OAuth2 client?"
      );
    }

    return accessToken;
  } catch {
    console.log(
      "Failed to obtain an access token. Have you read the documentation and set up your OAuth2 client?"
    );

    throw new Error("Failed to obtain an access token");
  }
}

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
  try {
    const tokenResponseRaw = await fetch(identityTokenUrl, {
      method: "POST",
      body: "grant_type=client_credentials&scope=avacloud",
      headers: {
        Authorization: "Basic " + btoa(clientId + ":" + clientSecret),
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
    if (tokenResponseRaw.status !== 200) {
      throw new Error(
        "Failed to obtain an access token, status code: " +
          tokenResponseRaw.status
      );
    }

    const jsonResponse = await tokenResponseRaw.json();
    const accessToken = jsonResponse["access_token"];
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

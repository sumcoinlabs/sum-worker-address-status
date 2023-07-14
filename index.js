addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event));
});

async function handleRequest(event) {
  const request = event.request;

  async function readRequestBody(request) {
    const { headers } = request;
    const contentType = headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      return request.json();
    }
  }

  async function parseBody(reqBody) {
    let foundDifference = false;
    let answerArray = [];
    if (
      reqBody !== undefined &&
      reqBody.hasOwnProperty("coin") &&
      reqBody.hasOwnProperty("addresses")
    ) {
      //valid request
      let kvInstance;
      if (reqBody.coin === "peercoin" || reqBody.coin === "peercoinTestnet") {
        kvInstance = peercoin_kv;
      } else {
        return { status: 400 };
      }

      for (const element of reqBody.addresses) {
        for (var key of Object.keys(element)) {
          const addr = key;
          const number = element[key];
          //get data from database
          const addressKvData = JSON.parse(await kvInstance.get(addr));
          if (addressKvData !== null && addressKvData["n"] > number) {
            foundDifference = true;
            answerArray.push({ address: addr, n: parseInt(addressKvData["n"]), utxos: addressKvData["utxos"] });
          }
        }
      }
    } else {
      return { status: 400 };
    }

    return JSON.stringify(
      { foundDifference: foundDifference, addresses: answerArray },
      null,
      2
    );
  }

  const reqBody = await readRequestBody(request);
  const parseResult = await parseBody(reqBody);

  if (parseResult.hasOwnProperty("status") && parseResult.status == 400) {
    return new Response("bad request", { status: 400 });
  }

  return new Response(parseResult, {
    headers: { "content-type": "application/json" },
  });
}
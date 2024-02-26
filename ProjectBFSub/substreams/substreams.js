const TOKEN = process.env.SUBSTREAMS_API_TOKEN;
const SPKG = "taiss-v0.1.1.spkg" 
const MODULE = "prom_out"

const main = async () => {
    const pkg = await fetchPackage()
    const registry = createRegistry(pkg);

    const transport = createConnectTransport({
        baseUrl: "	https://jungle4.firehose.eosnation.io",
        interceptors: [createAuthInterceptor(TOKEN)],
        useBinaryFormat: true,
        jsonOptions: {
            typeRegistry: registry,
        },
    });

    const request = createRequest({
        substreamPackage: pkg,
        outputModule: MODULE,
        startBlockNum: block_num,
        stopBlockNum: '+1',
    });

    // Iterate over blocks
    for await (const response of streamBlocks(transport, request)) {
        const output = unpackMapOutput(response.response, registry);

        if (output !== undefined && !isEmptyMessage(output)) {
            const outputAsJson = output.toJson({typeRegistry: registry});
            console.log(outputAsJson)
        }
    }
}
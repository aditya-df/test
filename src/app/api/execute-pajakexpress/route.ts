import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/utils/auth-utils-server";
import { ToolboxClient } from "@toolbox-sdk/core";
import {
  decodeBase64Value,
  getFunctionDataFromDB,
  isMMYYYYFormat,
  isSameKey,
  isWithinTolerance,
  mmYyyyToYyyyMmDd,
  normalizeNPWP,
  normalizeText,
} from "@/utils/utils";
import { tool } from "ai";

const buildFetchOptions = (
  url: string,
  method: string,
  headersObj: Record<string, any>,
  params: Record<string, any>,
) => {
  const isGetOrHead = ["GET", "HEAD"].includes(method.toUpperCase());
  const finalUrl =
    isGetOrHead && params ? `${url}?${new URLSearchParams(params)}` : url;

  const options = { method, headers: headersObj };

  if (!isGetOrHead && params) {
    (options as any).body = JSON.stringify(params);
  }

  return { url: finalUrl, options };
};

function createObjectUserInput(args: any) {
  return args.fields
    .split(";")
    .reduce((acc: Record<string, any>, field: string, index: number) => {
      acc[field] = args.value.split(";")[index];
      return acc;
    }, {});
}

async function processRestTools({
  userFieldInput,
  tool,
  session,
  bearerToken,
  xToken,
}: {
  userFieldInput: Record<string, any>;
  tool: any;
  session: any;
  bearerToken?: string;
  xToken?: string;
}): Promise<any> {
  const { requestUrl, requestMethod, parameters } = await getFunctionDataFromDB(
    session,
    tool.toolName,
  );

  const headersObj = parameters["rest-api"].headers
    .filter((h: any) => h.is_enabled)
    .reduce((acc: Record<string, any>, header: any) => {
      // First pass: try exact match or isSameKey match
      let matched = false;
      for (const fieldKey of Object.keys(userFieldInput)) {
        if (isSameKey(fieldKey.trim(), header.key.trim())) {
          acc[header.key] = userFieldInput[fieldKey];
          matched = true;
          break;
        }
      }
      // Second pass: fallback to exact key lookup
      if (!matched && userFieldInput[header.key] !== undefined) {
        acc[header.key] = userFieldInput[header.key];
      }
      // Final fallback to original header value
      if (!(header.key in acc)) {
        acc[header.key] = header.value;
      }
      return acc;
    }, {});

  if (bearerToken) {
    headersObj["Authorization"] = `Bearer ${bearerToken}`;
  }
  if (xToken) {
    headersObj["x-token"] = xToken;
  }

  const queryParamsDB = parameters["rest-api"].queryParams;
  const queryParams =
    queryParamsDB.length > 0
      ? queryParamsDB.reduce((acc: Record<string, any>, param: any) => {
          // Jika key ada di objParams, ambil dari objParams, jika tidak pakai value asli
          acc[param.key] =
            userFieldInput[param.key] !== undefined
              ? userFieldInput[param.key]
              : param.value;
          return acc;
        }, {})
      : null;

  if (queryParams) {
    Object.keys(userFieldInput).forEach((key) => {
      if (!(key in queryParams)) {
        queryParams[key] = userFieldInput[key];
      }
    });
  }

  if (requestUrl) {
    const { url, options } = buildFetchOptions(
      requestUrl,
      requestMethod,
      headersObj,
      queryParams || JSON.parse(parameters["rest-api"].request_body || "{}"),
    );
    console.log({ url, options });
    const response = await fetch(url, options);

    return await response.json();
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { tools, batch, limit } = await req.json();
    const toolsVAT = tools.find(
      (tool: any) =>
        tool.toolName == "get_vat_in_transactions_pajakexpress_1985",
    );

    if (!tools.some((tool: any) => tool.type == "auth")) {
      tools.unshift({
        args: {
          value: "",
          fields: "bearer_token",
        },
        toolName: "get_x_token_auth_321",
        type: "auth",
      });
      tools.unshift({
        args: {
          value: "test@example.com;password123",
          fields: "email;password",
        },
        toolName: "get_pajakexpress_auth_token_4917",
        type: "auth",
      });
    }

    if (
      tools.find(
        (tool: any) =>
          tool.toolName == "get_vat_in_transactions_pajakexpress_1985",
      )
    ) {
      tools.push({
        toolName: "search-entry-for-ppn-vendor",
        type: "mcp",
        args: { vendor_name: "" },
      });
    }

    console.log({ tools });
    let totalBatch = 1;
    let bearerToken = "",
      xToken = "",
      periode = "";

    // load tool from MCP server
    const obj: Record<string, any> = {};
    try {
      const client = new ToolboxClient("http://36.91.92.17:5000");
      const toolboxTools = await client.loadToolset("my-toolset");

      toolboxTools.forEach((toolboxTool: any) => {
        obj[toolboxTool.toolName] = {
          description: toolboxTool.getDescription(),
          parameters: toolboxTool.getParamSchema(),
          execute: toolboxTool,
        };
      });
    } catch (err) {
      console.error("Error loading toolbox tools:", err);
    }
    console.log({ obj });

    await Promise.all(
      tools
        .filter((tool: any) => tool.type == "auth")
        .map(async (tool: any) => {
          const userFieldInput = createObjectUserInput(tool.args);

          const data = await processRestTools({
            userFieldInput,
            tool,
            session,
            bearerToken,
          });

          const token = data?.data?.token || "";
          if (tool.toolName == "get_pajakexpress_auth_token_4917") {
            bearerToken = token;
          } else if (tool.toolName == "get_x_token_auth_321") {
            xToken = token;
          }
        }),
    );

    const resultRest = await Promise.all(
      tools
        .filter((tool: any) => tool.type == "rest")
        .map(async (tool: any) => {
          const userFieldInput = createObjectUserInput(tool.args);
          userFieldInput["page"] = batch || 1;
          userFieldInput["limit"] = limit;
          if (Object.keys(userFieldInput).includes("periode")) {
            periode = userFieldInput["periode"];
          }

          const data = await processRestTools({
            userFieldInput,
            tool,
            session,
            bearerToken,
            xToken,
          });
          // console.log({ data });

          totalBatch = Math.ceil(data?.metaPage?.totalRow / limit);

          if (data?.data && Array.isArray(data.data)) {
            return data.data.map((item: any) => {
              const {
                tglpemotongan,
                noBupot,
                pphDipotong,
                totalppn,
                namatokopenjual,
                npwppenjual,
                nama,
                nomorfaktur,
              } = item;
              return {
                tglpemotongan,
                noBupot,
                pphDipotong,
                totalppn,
                namatokopenjual,
                npwppenjual,
                nama,
                nomorfaktur,
              };
            });
          }

          return data;
        }),
    );
    const dataRest = resultRest.filter((item) => item !== undefined).flat();
    console.log({ dataRest: dataRest[0] });

    const resultMCP = await Promise.all(
      tools
        .filter((tool: any) => tool.type == "mcp")
        .map(async (tool: any) => {
          const args = tool.args;
          if (Object.keys(args).includes("external_doc_no")) {
            args.external_doc_no = dataRest
              .map((item) => item.noBupot)
              .filter(Boolean)
              .join(",");
          } else if (Object.keys(args).includes("vendor_name")) {
            args.vendor_name = dataRest
              .map((item) => {
                let clean =
                  item?.namatokopenjual ||
                  item?.nama ||
                  ""
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
                    .replace(/"/g, "&quot;")
                    .replace(/'/g, "&apos;");

                // 2. Ganti semua karakter "bahaya" untuk XML name dengan prefix aman
                clean = clean
                  .replace(/[^a-zA-Z0-9\s\-_]/g, (match: string) => {
                    // Ganti titik, koma, kurung, dll dengan format XML-safe
                    return (
                      "_" + match.charCodeAt(0).toString(16).toUpperCase() + "_"
                    );
                  })
                  // .replace(/\s+/g, "_SPACE_") // Multiple spaces → single token
                  .replace(/^[^a-zA-Z]+/, "") // Hapus karakter non-alfabet di AWAL
                  .replace(/[^a-zA-Z0-9\-_]/g, "_"); // Ganti sisa karakter aneh

                return clean;
              })
              .filter((v, i, a) => a.indexOf(v) === i)
              .slice(0, limit)
              .join(",");
          }

          if (periode && isMMYYYYFormat(periode)) {
            args.periode = mmYyyyToYyyyMmDd(periode);
          }
          console.log({ args });

          if (obj[tool.toolName]) {
            try {
              const responseMCP = await obj[tool.toolName].execute(args);
              return decodeBase64Value(JSON.parse(responseMCP));
            } catch (error) {
              console.error(
                `Error executing MCP tool ${tool.toolName}:`,
                error,
              );
              return undefined;
            }
          }
          return undefined;
        }),
    );

    const dataMCP =
      resultMCP.filter((item) => Boolean(item)).length > 0
        ? resultMCP
            .map((obj) => Object.values(obj))
            .flat()
            .map((item: any) => ({
              vendorName: item["Nama Vendor"] || "",
              amount: item.Amount || "",
              docNo: toolsVAT
                ? item["GLE DOC"]
                : item["External Document No_"] || "",
              npwp: item["NPWP"] || "",
              noFaktur: item["Nomor Faktur"] || "",
              normalizedNpwp: normalizeNPWP("0" + (item["NPWP"] || "")),
            }))
        : [];
    console.log({ dataMCP: dataMCP[0] });

    const joined = dataRest.map((rest) => {
      let matchDataNAV = null,
        filteredNAVData; // filteredData has data only if tools is VAT

      if (toolsVAT) {
        // const targetNpwp = normalizeNPWP(rest.npwppenjual);
        // filteredNAVData = dataMCP.filter((mcp) =>
        //   mcp.normalizedNpwp.includes(targetNpwp),
        // );

        const targetName = normalizeText(rest.namatokopenjual);
        filteredNAVData = dataMCP.filter((mcp) => {
          return normalizeText(mcp.vendorName).includes(targetName);
        });

        matchDataNAV = filteredNAVData.find((mcp) =>
          isWithinTolerance(parseInt(mcp.amount), parseInt(rest.totalppn)),
        );

        if (!matchDataNAV && filteredNAVData.length > 0) {
          matchDataNAV = filteredNAVData[0];
        }
      } else {
        matchDataNAV = dataMCP.find((mcp) => mcp.docNo?.includes(rest.noBupot));
      }

      let matchStatus;
      const pphDipotong = rest?.pphDipotong || rest?.totalppn;

      if (!matchDataNAV) {
        matchStatus = "Missing GL";
      } else {
        const pphValue = parseInt(pphDipotong);
        const amountValue = Math.abs(parseInt(matchDataNAV.amount));
        const isSameAmount = isWithinTolerance(pphValue, amountValue);

        if (
          isSameAmount &&
          toolsVAT &&
          normalizeNPWP(matchDataNAV.noFaktur)?.includes(rest.nomorfaktur)
        ) {
          matchStatus = "Match";
          const sameAmountNAVData =
            filteredNAVData?.filter((mcp) =>
              isWithinTolerance(mcp.amount, pphValue),
            ) || [];

          if (sameAmountNAVData?.length > 1) {
            matchStatus =
              "Match (" +
              sameAmountNAVData.filter((mcp) =>
                isWithinTolerance(mcp.amount, pphValue),
              ).length +
              " records with the same amount value)";
          }
        } else {
          if (matchDataNAV && isSameAmount) {
            matchStatus = "Match";
          } else {
            matchStatus = "Mismatch";
            matchDataNAV = null;

            if (filteredNAVData && filteredNAVData?.length > 0) {
              matchStatus =
                "Mismatch (" + filteredNAVData?.length + " data found)";
            }
          }
        }
      }

      return {
        "Tanggal potong": rest?.tglpemotongan || rest?.tanggalfaktur,
        "No Bupot": rest.noBupot,
        "Nama Vendor": rest?.namatokopenjual || rest?.nama || "",
        "Pajak dipotong PajakExpress": pphDipotong,
        "Amount Navision": matchDataNAV ? matchDataNAV.amount : null,
        "Document No Navision": matchDataNAV ? matchDataNAV.docNo : null,
        status: matchStatus,
        nomorfaktur: rest.nomorfaktur,
        noFaktur: matchDataNAV?.noFaktur,
      };
    });

    return NextResponse.json({
      data: joined
        // .filter((item) => item.status !== "Match")
        .sort((a, b) => {
          const statusCmp = a.status.localeCompare(b.status);
          return statusCmp !== 0
            ? statusCmp
            : a["Nama Vendor"].localeCompare(b["Nama Vendor"]);
        }),
      meta: {
        totalBatch,
        limit,
      },
      dataMCP: dataMCP.length,
    });
  } catch (error) {
    console.error("Error searching chats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

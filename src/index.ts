import "dotenv/config";
import { Octokit } from "@octokit/core";
import EUCountries from "./constants/EUCountries";
import iso31661Alpha2 from "./constants/iso-3166-1-alpha-2";
import iso4217 from "./constants/iso4217";

const token = process.env.GITHUB_TOKEN;

if (!token) {
  throw new Error("GITHUB_TOKEN environment variable is required");
}

async function getBigMacData() {
  const octokit = new Octokit({
    auth: token,
  });

  const res = await octokit.request(
    "GET /repos/{owner}/{repo}/contents/{path}",
    {
      owner: "TheEconomist",
      repo: "big-mac-data",
      path: "output-data/big-mac-full-index.csv",
    },
  );

  if (Array.isArray(res.data) || res.data.type !== "file") {
    throw new Error(
      `Failed to get big mac data. Unexpected response from GitHub: ${JSON.stringify(
        res,
        null,
        2,
      )}`,
    );
  }
  const content = Buffer.from(res.data.content, "base64")
    .toString("utf8")
    .split("\n");

  let currentDate = "";
  const relevantRows: string[] = [];

  for (let i = content.length - 1; i >= 0; i -= 1) {
    const [date] = content[i].split(",");
    if (!date) {
      continue;
    }

    if (!currentDate) {
      currentDate = date;
    }

    if (date !== currentDate) {
      break;
    }

    relevantRows.push(content[i]);
  }

  return relevantRows.flatMap((row) => {
    const [, , currencyCode, initialCountryName, , dollarEx] = row.split(",");

    let countryName = initialCountryName;

    if (countryName === "Britain") {
      countryName = "United Kingdom";
    }

    const dollarExNum = parseFloat(dollarEx);

    if (countryName === "Euro area") {
      return EUCountries.map((name) => {
        const countryIsoA2 = iso31661Alpha2[name];

        if (!countryIsoA2) {
          throw new Error(
            `Failed to get big mac data. No ISO 3166-1 alpha-2 code found for country: ${name}`,
          );
        }

        return {
          countryCodeA2: countryIsoA2,
          currencyCode,
          countryName: name,
          dollarExNum,
        };
      });
    }

    const countryIsoA2 = iso31661Alpha2[countryName];

    if (!countryIsoA2) {
      throw new Error(
        `Failed to get big mac data. No ISO 3166-1 alpha-2 code found for country: ${countryName}`,
      );
    }

    return {
      countryCodeA2: countryIsoA2,
      currencyCode,
      countryName,
      dollarExNum,
    };
  });
}

const inputPrices = [1, 5, 20];

async function main() {
  try {
    const bigMacData = await getBigMacData();

    const converted = bigMacData.map(
      ({ countryName, countryCodeA2, currencyCode, dollarExNum }) => {
        const pricesInCountry = inputPrices.map((price) => price * dollarExNum);
        const decimalPlacesInCountry = iso4217[currencyCode];

        if (decimalPlacesInCountry === undefined) {
          throw new Error(
            `No ISO 4217 D-code found for currency: ${currencyCode}`,
          );
        }

        const pricesInCountryInMinimumAmount = pricesInCountry.map(
          (price) => price * 10 ** decimalPlacesInCountry,
        );

        return {
          country: {
            name: countryName,
            a2: countryCodeA2,
          },
          currencyCode,
          values: pricesInCountryInMinimumAmount,
        };
      },
    );
    console.log(converted);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();

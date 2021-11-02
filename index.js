const { PublicKey, Connection } = require("@solana/web3.js");
const { BN } = require("bn.js");
const { ObligationParser } = require("./obligation");

const connection = new Connection(
  "https://api.mainnet-beta.solana.com",
  "confirmed"
);
const SOLEND_PROGRAM_ID = "So1endDq2YkqhipRh3WViPa8hdiSpxWy6z3Z6tMCpAo";
const LENDING_MARKET_MAIN = "4UpD2fh7xH3VP9QQaXtsS1YY3bxzWhtfpks7FatyKvdY";
const OBLIGATION_LEN = 1300;
const RESERVES_TO_ASSET_MAP = {
  "8PbodeaosQP19SjYFx855UMqWxH2HynZLdBXmsrbac36": "SOL",
  "BgxfHJDzm44T7XG68MYKx7YisTjZu73tVovyZSjJMpmw": "USDC",
  "8K9WC8xoh2rtQNY7iEGXtPvfbDCi563SdWhCAhuMP2xE": "USDT",
  "3PArRsZQ6SLkr1WERZWyC6AqsajtALMq4C66ZMYz4dKQ": "ETH",
  "GYzjMCXTDue12eUGKKWAqtF5jcBYNmewr6Db6LaguEaX": "BTC",
  "5suXmvdbKQ98VonxGCXqViuWRu8k4zgZRxndYKsH2fJg": "SRM",
  "2dC4V23zJxuv521iYQj8c471jrxYLNQFaGS6YPwtTHMd": "FTT",
  "9n2exoMQwMTzfw6NFoFFujxYPndWVLtKREJePssrKb36": "RAY",
  "Hthrt4Lab21Yz1Dx9Q4sFW4WVihdBUTtWRQBjPsYHCor": "SBR",
  "5Sb6wDpweg6mtYksPJ2pfGbSyikrhR8Ut8GszcULQ83A": "MER"
};
const ASSET_TO_DECIMALS = {
  "SOL": 9,
  "USDC": 6,
  "ETH": 6,
  "BTC": 6,
  "SRM": 6,
  "USDT": 6,
  "MER": 6,
  "FTT": 6,
  "SBR": 6,
  "UST": 9,
  "RAY":6
};

async function main() {
  const [totalDeposits, totalBorrows] = await getTotalDepositsAndBorrows();
  console.log("Total Deposits:");
  for (const [asset, rawBalance] of Object.entries(totalDeposits)) {
    const balance = rawBalance.div(new BN(10 ** ASSET_TO_DECIMALS[asset]));
    console.log(asset, balance.toString());
  }
  
  console.log("\n");
  console.log("Total Borrows:");
  for (const [asset, rawBalance] of Object.entries(totalBorrows)) {
    const balance = rawBalance.div(new BN(10 ** ASSET_TO_DECIMALS[asset]));
    console.log(asset, balance.toString());
  }
}

async function getObligations() {
  const accounts = await connection.getProgramAccounts(
    new PublicKey(SOLEND_PROGRAM_ID),
    {
      commitment: connection.commitment,
      filters: [
        {
          memcmp: {
            offset: 10,
            bytes: LENDING_MARKET_MAIN,
          },
        },
        {
          dataSize: OBLIGATION_LEN,
        },
      ],
      encoding: "base64",
    }
  );
  console.log("Number of users:", accounts.length);
  const obligations = accounts.map((account) =>
    ObligationParser(account.pubkey, account.account)
  );
  return obligations;
}

async function getTotalDepositsAndBorrows() {
  const obligations = await getObligations();
  let totalDeposits = {};
  let totalBorrows = {};
  for (const obligation of obligations) {
    for (const deposit of obligation.info.deposits) {
      const reserve = deposit.depositReserve.toBase58();
      if (!(reserve in RESERVES_TO_ASSET_MAP)) {
        console.log(
          "WARNING: Unrecognized reserve. Update RESERVES_TO_ASSET_MAP."
        );
        continue;
      }
      const asset = RESERVES_TO_ASSET_MAP[reserve];
      if (!(asset in totalDeposits)) {
        totalDeposits[asset] = new BN(0);
      }
      totalDeposits[asset] = totalDeposits[asset].add(deposit.depositedAmount);
    }

    for (const borrow of obligation.info.borrows) {
      const reserve = borrow.borrowReserve.toBase58();
      if (!(reserve in RESERVES_TO_ASSET_MAP)) {
        console.log(
          "WARNING: Unrecognized reserve. Update RESERVES_TO_ASSET_MAP."
        );
        continue;
      }
      const asset = RESERVES_TO_ASSET_MAP[reserve];
      if (!(asset in totalBorrows)) {
        totalBorrows[asset] = new BN(0);
      }
      const borrowedAmountBaseUnit = borrow.borrowedAmountWads.div(
        new BN("1" + "0".padEnd(18, "0"))
      );
      totalBorrows[asset] = totalBorrows[asset].add(borrowedAmountBaseUnit);
    }
  }

  return [totalDeposits, totalBorrows];
}

main();

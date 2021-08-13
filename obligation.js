const BufferLayout = require("buffer-layout");
const Layout = require("./utils/layout");
const { LastUpdateLayout } = require("./lastUpdate");

const ObligationLayout = BufferLayout.struct([
  BufferLayout.u8("version"),
  LastUpdateLayout,
  Layout.publicKey("lendingMarket"),
  Layout.publicKey("owner"),
  Layout.uint128("depositedValue"),
  Layout.uint128("borrowedValue"),
  Layout.uint128("allowedBorrowValue"),
  Layout.uint128("unhealthyBorrowValue"),
  BufferLayout.blob(64, "_padding"),
  BufferLayout.u8("depositsLen"),
  BufferLayout.u8("borrowsLen"),
  BufferLayout.blob(1096, "dataFlat"),
]);

const ObligationCollateralLayout = BufferLayout.struct([
  Layout.publicKey("depositReserve"),
  Layout.uint64("depositedAmount"),
  Layout.uint128("marketValue"),
  BufferLayout.blob(32, "padding"),
]);

const ObligationLiquidityLayout = BufferLayout.struct([
  Layout.publicKey("borrowReserve"),
  Layout.uint128("cumulativeBorrowRateWads"),
  Layout.uint128("borrowedAmountWads"),
  Layout.uint128("marketValue"),
  BufferLayout.blob(32, "padding"),
]);

const ObligationParser = (pubkey, info) => {
  const buffer = Buffer.from(info.data);
  const {
    version,
    lastUpdate,
    lendingMarket,
    owner,
    depositedValue,
    borrowedValue,
    allowedBorrowValue,
    unhealthyBorrowValue,
    depositsLen,
    borrowsLen,
    dataFlat,
  } = ObligationLayout.decode(buffer);

  if (lastUpdate.slot.isZero()) {
    return null;
  }

  const depositsBuffer = dataFlat.slice(
    0,
    depositsLen * ObligationCollateralLayout.span
  );
  const deposits = BufferLayout.seq(
    ObligationCollateralLayout,
    depositsLen
  ).decode(depositsBuffer);

  const borrowsBuffer = dataFlat.slice(
    depositsBuffer.length,
    depositsLen * ObligationCollateralLayout.span +
      borrowsLen * ObligationLiquidityLayout.span
  );
  const borrows = BufferLayout.seq(
    ObligationLiquidityLayout,
    borrowsLen
  ).decode(borrowsBuffer);

  const obligation = {
    version,
    lastUpdate,
    lendingMarket,
    owner,
    depositedValue,
    borrowedValue,
    allowedBorrowValue,
    unhealthyBorrowValue,
    deposits,
    borrows,
  };

  const details = {
    pubkey,
    account: {
      ...info,
    },
    info: obligation,
  };

  return details;
};

module.exports = {
  ObligationParser,
};

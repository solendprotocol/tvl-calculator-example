const BufferLayout = require("buffer-layout");
const Layout = require("./utils/layout");

const LastUpdateLayout = BufferLayout.struct(
  [Layout.uint64("slot"), BufferLayout.u8("stale")],
  "lastUpdate"
);

module.exports = {
  LastUpdateLayout,
};

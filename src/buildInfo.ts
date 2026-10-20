/** Facts frozen into this bundle when it was built. They cannot change after the page has loaded. */
export const buildInfo = {
  time: new Date(__BUILD_TIME__),
  commit: __BUILD_COMMIT__,
}

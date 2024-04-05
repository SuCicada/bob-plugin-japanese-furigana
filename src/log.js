exports.info = function info(...args) {
  $log.info(args.join(" "));
}

exports.info = function error(...args) {
  $log.error(args.join(" "));
}
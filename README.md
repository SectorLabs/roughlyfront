# roughlyfront

roughlyfront is a small and mostly correct emulator for AWS Lambda@Edge. It allows you to run, test and develop your AWS Lambda@Edge functions locally.

## Usage
```
Usage: roughlyfront [options]

A roughly accurate emulator for AWS Lambda@Edge.

Options:
  -e, --event-type               event to emulate (choices: "origin-request")
  -p, --port <port>              port to listen on (default: 8787)
  -h, --host <host>              host to listen on (default: "0.0.0.0")
  -f, --lambda-file <js script>  handler script to invoke (default: "index.js")
  -n, --lambda-handler <name>    handler function to invoke (default:
                                 "handler")
  --help                         display help for command
```

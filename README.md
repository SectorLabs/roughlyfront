# Roughlyfront

[![CircleCI](https://dl.circleci.com/status-badge/img/gh/SectorLabs/roughlyfront/tree/master.svg?style=svg&circle-token=c60be6386f3065618b8df23e40962720c402e708)](https://dl.circleci.com/status-badge/redirect/gh/SectorLabs/roughlyfront/tree/master)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Roughlyfront is a small and mostly correct emulator for AWS Lambda@Edge. It allows you to run, test and develop your AWS Lambda@Edge functions locally.

## What works
* Viewer request events
* Origin request events
* Generated responses
* Compatible logging format
* HTTPS
* Hot reloading lambda functions
* Hot rebuilding lambda functions
* Custom origin headers
* Custom origin path
* CloudWatch subscriptions
* Mocked `CloudFront-Viewer-*` headers
* Mocked `x-cache` response headers
* Mocked `x-amz-*` response headers
* Mocked `via` header

## What doesn't work
* Viewer response events
* Origin response events
* S3 origins
* Assumes all behaviors forward all headers and query string
* Origin timeout
* Origin keep alive
* Always adds mocked `CloudFront-Viewer` headers
* No caching whatsoever, all requests pass to the origin

## Usage
Roughlyfront supports emulating multiple CloudFront distributions and Lambda@Edge functions. You configure the available distributions and lambda functions through a Toml configuration file.

You start Roughlyfront with the `roughlyfront` command and pass it the path to the configuration file:

```shell
$ roughlyfront -c myconfig.toml
```

### Command line options
```
Usage: roughlyfront [options]

A roughly accurate emulator for AWS Lambda@Edge.

Options:
  -c, --config <filename>  config file to use
  -p, --port <port>        port to listen on (default: 8787)
  -h, --host <host>        host to listen on (default: "0.0.0.0")
  --https-key <file>       path to a SSL key to use
  --https-cert <file>      path to a SSL certificate to use
  -b, --build              build lambda functions using the configured build
                           command
  --help                   display help for command
```

### Configuration
#### Example
```toml
[[lambda.builds]]
command = "webpack"
watch = ["./src"]

[[lambda.functions]]
name = "myedgelambda"
version = 1
file = "./dist/index.js"
handler = "nameofhandlerfunction"

[[cloudfront.distributions]]
id = "default"
domains = ["mypublicdomain.com"]
[[cloudfront.distributions.origins]]
name = "default"
protocol = "http"
domain = "localhost"
port = 3000
path = ""
headers = { "X-Test" = 1 }
[[cloudfront.distributions.behaviors]]
pattern = "/*"
origin = "default"
lambdas = { origin-request = "myedgelambda" }

[[cloudwatch.subscriptions]]
name = "myfilter"
pattern = "-START"
destination = "myedgelambda"
group = "/aws/lambda/us-east-1.myedgelambda"
```

#### Configuring Lambda functions
Roughlyfront supports configuring multiple Node.js Lambda functions that can be associated with CloudFront behaviors or CloudWatch subscriptions. Roughlyfront uses the same Node.js version as Roughlyfront itself is running with.

Lambda functions automatically hot-reload whenever Roughlyfront detects the specified `file` has been modified. The `file` path is always relative to the directory in which the Roughlyfront config file is located. Not the current working directory.

The `version` is optional. It has no real importance. It is passed to your function through the `context` and the `AWS_LAMBDA_FUNCTION_VERSION` environment variable. The default, if no version is specified, is `1`.

#### Building Lambda functions
If your Lambda function is built in TypeScript or requires a compilation/transpilation/build process, you can configure Roughlyfront to automatically build your function whenever you make changes to the code.

This functionality is entirely optional. If you want to manage the build process yourself or don't require a build process you can leave out this section entirely.

A single build set up can be responsible for building one or multiple Lambda functions. The Lambda functions will be reloaded when the build output changes.

Use the `watch` property to specify what directories and files Roughlyfront should watch. Directories are watched recursively and the build triggers when files are added/removed.

#### Multiple distributions
Roughlyfront allows you to configure multiple distributions. It matches requests against the distribution by inspecting the value of `Host` header. Set the distribution's `domains` property to match the `Host` header you pass.

Usually, you'll want to set up some aliases in your `/etc/hosts` file to make this easier:

```
127.0.0.1 mydomain.com
127.0.0.1 anotherdomain
```

If you don't want multiple distributions or custom domain names, set the `domains` property as `localhost:<roughlyfront port>`.

#### Behaviors without lambda
The `lambdas` property on a behavior is optional. If none is specified, the request is always forwarded to the origin.

#### CloudWatch subscriptions
All logs from the Lambda functions are forwarded to emulated CloudWatch log groups. These are the same logs that the console displays. Adding CloudWatch subscriptions is optional.

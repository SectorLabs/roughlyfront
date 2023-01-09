# Roughlyfront

[![CircleCI](https://dl.circleci.com/status-badge/img/gh/SectorLabs/roughlyfront/tree/master.svg?style=svg&circle-token=c60be6386f3065618b8df23e40962720c402e708)](https://dl.circleci.com/status-badge/redirect/gh/SectorLabs/roughlyfront/tree/master)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Roughlyfront is a small and mostly correct emulator for AWS Lambda@Edge. It allows you to run, test and develop your AWS Lambda@Edge functions locally.

## What works
* Viewer request events
* Origin request events
* Generated responses
* Hot reloading lambdas

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

By default, Roughlyfront will listen on port `8787`.

### Configuration
#### Example
```toml
[[lambdas]]
name = "myedgelambda"
file = "/path/to/index.js"
handler = "nameofhandlerfunction"

[[distributions]]
id = "default"
domains = ["mypublicdomain.com"]
[[distributions.origins]]
name = "default"
protocol = "http"
domain = "localhost"
port = "3000"
path = ""
[[distributions.behaviors]]
pattern = "/*"
origin = "default"
lambdas = { origin-request = "myedgelambda" }
```

#### Lambda files
The path to your Lambda function's entrypoint file is always relative to the location of the config file. _Not_ to the current working directory.

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

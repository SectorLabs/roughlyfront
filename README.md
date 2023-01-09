# roughlyfront

roughlyfront is a small and mostly correct emulator for AWS Lambda@Edge. It allows you to run, test and develop your AWS Lambda@Edge functions locally.

## What works
* Viewer request events
* Origin request events
* Generated responses

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
Roughlyfront supports emulating multiple CloudFront distributions and Lambda@Edge functions. You configure the available distributions and lambda functions through a Toml configuration file:

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

The distribution is selected based on the `Host` header. Make sure that the distribution's `domains` property matches the `Host` header you pass.

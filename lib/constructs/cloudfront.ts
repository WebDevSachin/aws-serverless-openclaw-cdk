import * as cdk from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Construct } from 'constructs';

/**
 * Properties for the OpenClawCloudFront construct
 */
export interface OpenClawCloudFrontProps {
  /**
   * The ALB to use as origin
   */
  readonly loadBalancer: elbv2.IApplicationLoadBalancer;

  /**
   * Basic auth username
   * @default 'admin'
   */
  readonly authUsername?: string;

  /**
   * Basic auth password
   * @default 'openclaw2025'
   */
  readonly authPassword?: string;
}

/**
 * OpenClaw CloudFront Construct
 *
 * Creates a CloudFront distribution with:
 * - HTTPS (free SSL certificate)
 * - Basic authentication via CloudFront Functions
 * - ALB as origin
 */
export class OpenClawCloudFront extends Construct {
  /**
   * The CloudFront distribution
   */
  public readonly distribution: cloudfront.Distribution;

  /**
   * The CloudFront domain name
   */
  public readonly domainName: string;

  constructor(scope: Construct, id: string, props: OpenClawCloudFrontProps) {
    super(scope, id);

    const authUsername = props.authUsername ?? 'admin';
    const authPassword = props.authPassword ?? 'openclaw2025';

    // Create basic auth function
    const authFunction = new cloudfront.Function(this, 'BasicAuthFunction', {
      code: cloudfront.FunctionCode.fromInline(`
        function handler(event) {
          var request = event.request;
          var headers = request.headers;
          
          // Base64 encoded "${authUsername}:${authPassword}"
          var expectedAuth = "Basic " + "${Buffer.from(`${authUsername}:${authPassword}`).toString('base64')}";
          
          if (headers.authorization && headers.authorization.value === expectedAuth) {
            return request;
          }
          
          return {
            statusCode: 401,
            statusDescription: 'Unauthorized',
            headers: {
              'www-authenticate': { value: 'Basic' }
            }
          };
        }
      `),
      runtime: cloudfront.FunctionRuntime.JS_2_0,
      comment: 'Basic authentication for OpenClaw',
    });

    // Create a custom origin request policy for WebSocket support
    // This ensures all headers including Upgrade and Connection are forwarded
    const wsOriginRequestPolicy = new cloudfront.OriginRequestPolicy(this, 'WsOriginPolicy', {
      originRequestPolicyName: 'OpenClawWebSocketPolicy',
      comment: 'Policy for WebSocket support - forwards all headers',
      headerBehavior: cloudfront.OriginRequestHeaderBehavior.all(),
      cookieBehavior: cloudfront.OriginRequestCookieBehavior.all(),
      queryStringBehavior: cloudfront.OriginRequestQueryStringBehavior.all(),
    });

    // Create CloudFront distribution
    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: new origins.LoadBalancerV2Origin(props.loadBalancer, {
          protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
          httpPort: 80,
          originId: 'ALB-Origin',
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        originRequestPolicy: wsOriginRequestPolicy,
        functionAssociations: [
          {
            function: authFunction,
            eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
          },
        ],
      },
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      comment: 'OpenClaw HTTPS Distribution with Basic Auth and WebSocket Support',
      enabled: true,
      // Disable HTTP/2 to ensure WebSocket compatibility
      // WebSocket upgrade only works with HTTP/1.1
      httpVersion: cloudfront.HttpVersion.HTTP1_1,
    });

    this.domainName = this.distribution.distributionDomainName;

    // Output the CloudFront URL
    new cdk.CfnOutput(this, 'CloudFrontUrl', {
      value: `https://${this.domainName}`,
      description: 'OpenClaw HTTPS URL with Basic Auth',
    });

    new cdk.CfnOutput(this, 'AuthCredentials', {
      value: `Username: ${authUsername}, Password: ${authPassword}`,
      description: 'Basic Auth Credentials',
    });
  }
}

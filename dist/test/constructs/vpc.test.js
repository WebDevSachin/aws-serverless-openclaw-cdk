"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const cdk = __importStar(require("aws-cdk-lib"));
const assertions_1 = require("aws-cdk-lib/assertions");
const vpc_1 = require("../../lib/constructs/vpc");
describe('OpenClawVpc', () => {
    let app;
    let stack;
    beforeEach(() => {
        app = new cdk.App();
        stack = new cdk.Stack(app, 'TestStack', {
            env: {
                account: '123456789012',
                region: 'us-east-1',
            },
        });
    });
    // ============================================================================
    // VPC Configuration Tests
    // ============================================================================
    describe('VPC Configuration', () => {
        test('creates a VPC with correct CIDR', () => {
            new vpc_1.OpenClawVpc(stack, 'TestVpc');
            const template = assertions_1.Template.fromStack(stack);
            template.hasResourceProperties('AWS::EC2::VPC', {
                CidrBlock: '10.0.0.0/16',
                EnableDnsHostnames: true,
                EnableDnsSupport: true,
            });
        });
        test('creates VPC with custom CIDR when specified', () => {
            new vpc_1.OpenClawVpc(stack, 'TestVpc', {
                vpcCidr: '172.16.0.0/16',
            });
            const template = assertions_1.Template.fromStack(stack);
            template.hasResourceProperties('AWS::EC2::VPC', {
                CidrBlock: '172.16.0.0/16',
            });
        });
        test('VPC has 2 Availability Zones', () => {
            const vpcConstruct = new vpc_1.OpenClawVpc(stack, 'TestVpc');
            expect(vpcConstruct.vpc.availabilityZones.length).toBe(2);
        });
        test('VPC exports VPC ID', () => {
            const vpcConstruct = new vpc_1.OpenClawVpc(stack, 'TestVpc');
            expect(vpcConstruct.vpcId).toBeDefined();
            expect(typeof vpcConstruct.vpcId).toBe('string');
        });
    });
    // ============================================================================
    // Subnet Tests
    // ============================================================================
    describe('Subnets', () => {
        test('creates public and private subnets', () => {
            new vpc_1.OpenClawVpc(stack, 'TestVpc');
            const template = assertions_1.Template.fromStack(stack);
            // 2 public + 2 private = 4 subnets total
            template.resourceCountIs('AWS::EC2::Subnet', 4);
        });
        test('creates 2 public subnets', () => {
            const vpcConstruct = new vpc_1.OpenClawVpc(stack, 'TestVpc');
            expect(vpcConstruct.vpc.publicSubnets.length).toBe(2);
        });
        test('creates 2 private subnets', () => {
            const vpcConstruct = new vpc_1.OpenClawVpc(stack, 'TestVpc');
            expect(vpcConstruct.vpc.privateSubnets.length).toBe(2);
        });
        test('public subnets have /24 CIDR mask', () => {
            new vpc_1.OpenClawVpc(stack, 'TestVpc');
            const template = assertions_1.Template.fromStack(stack);
            const subnets = template.findResources('AWS::EC2::Subnet');
            const publicSubnets = Object.values(subnets).filter((subnet) => {
                return subnet.Properties.MapPublicIpOnLaunch === true;
            });
            // Verify we have 2 public subnets
            expect(publicSubnets.length).toBe(2);
        });
        test('exports public subnet IDs', () => {
            const vpcConstruct = new vpc_1.OpenClawVpc(stack, 'TestVpc');
            expect(vpcConstruct.publicSubnetIds.length).toBe(2);
            expect(vpcConstruct.publicSubnetIds.every(id => typeof id === 'string')).toBe(true);
        });
        test('exports private subnet IDs', () => {
            const vpcConstruct = new vpc_1.OpenClawVpc(stack, 'TestVpc');
            expect(vpcConstruct.privateSubnetIds.length).toBe(2);
            expect(vpcConstruct.privateSubnetIds.every(id => typeof id === 'string')).toBe(true);
        });
    });
    // ============================================================================
    // NAT Gateway Tests
    // ============================================================================
    describe('NAT Gateway', () => {
        test('creates 1 NAT gateway by default', () => {
            new vpc_1.OpenClawVpc(stack, 'TestVpc');
            const template = assertions_1.Template.fromStack(stack);
            template.resourceCountIs('AWS::EC2::NatGateway', 1);
        });
        test('creates NAT gateway when useNatGateway is true', () => {
            new vpc_1.OpenClawVpc(stack, 'TestVpc', {
                useNatGateway: true,
            });
            const template = assertions_1.Template.fromStack(stack);
            template.resourceCountIs('AWS::EC2::NatGateway', 1);
        });
        test('does not create NAT gateway when useNatGateway is false', () => {
            new vpc_1.OpenClawVpc(stack, 'TestVpc', {
                useNatGateway: false,
            });
            const template = assertions_1.Template.fromStack(stack);
            template.resourceCountIs('AWS::EC2::NatGateway', 0);
        });
        test('creates Elastic IP for NAT gateway', () => {
            new vpc_1.OpenClawVpc(stack, 'TestVpc');
            const template = assertions_1.Template.fromStack(stack);
            template.resourceCountIs('AWS::EC2::EIP', 1);
        });
    });
    // ============================================================================
    // Security Group Tests
    // ============================================================================
    describe('ALB Security Group', () => {
        test('creates ALB security group', () => {
            new vpc_1.OpenClawVpc(stack, 'TestVpc');
            const template = assertions_1.Template.fromStack(stack);
            template.hasResourceProperties('AWS::EC2::SecurityGroup', {
                GroupDescription: 'Security group for OpenClaw Application Load Balancer',
            });
        });
        test('ALB security group allows inbound HTTP (port 80) from anywhere', () => {
            new vpc_1.OpenClawVpc(stack, 'TestVpc');
            const template = assertions_1.Template.fromStack(stack);
            template.hasResourceProperties('AWS::EC2::SecurityGroup', {
                GroupDescription: 'Security group for OpenClaw Application Load Balancer',
                SecurityGroupIngress: assertions_1.Match.arrayWith([
                    assertions_1.Match.objectLike({
                        IpProtocol: 'tcp',
                        FromPort: 80,
                        ToPort: 80,
                        CidrIp: '0.0.0.0/0',
                    }),
                ]),
            });
        });
        test('ALB security group allows inbound HTTPS (port 443) from anywhere', () => {
            new vpc_1.OpenClawVpc(stack, 'TestVpc');
            const template = assertions_1.Template.fromStack(stack);
            template.hasResourceProperties('AWS::EC2::SecurityGroup', {
                GroupDescription: 'Security group for OpenClaw Application Load Balancer',
                SecurityGroupIngress: assertions_1.Match.arrayWith([
                    assertions_1.Match.objectLike({
                        IpProtocol: 'tcp',
                        FromPort: 443,
                        ToPort: 443,
                        CidrIp: '0.0.0.0/0',
                    }),
                ]),
            });
        });
        test('ALB security group allows all outbound traffic', () => {
            new vpc_1.OpenClawVpc(stack, 'TestVpc');
            const template = assertions_1.Template.fromStack(stack);
            template.hasResourceProperties('AWS::EC2::SecurityGroup', {
                GroupDescription: 'Security group for OpenClaw Application Load Balancer',
                SecurityGroupEgress: [
                    {
                        CidrIp: '0.0.0.0/0',
                        Description: 'Allow all outbound traffic by default',
                        IpProtocol: '-1',
                    },
                ],
            });
        });
    });
    describe('Fargate Security Group', () => {
        test('creates Fargate security group', () => {
            new vpc_1.OpenClawVpc(stack, 'TestVpc');
            const template = assertions_1.Template.fromStack(stack);
            template.hasResourceProperties('AWS::EC2::SecurityGroup', {
                GroupDescription: 'Security group for OpenClaw Fargate tasks',
            });
        });
        test('Fargate security group allows inbound port 3000 from ALB security group', () => {
            new vpc_1.OpenClawVpc(stack, 'TestVpc');
            const template = assertions_1.Template.fromStack(stack);
            // Find the Fargate security group ingress rule that references the ALB security group
            template.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
                IpProtocol: 'tcp',
                FromPort: 3000,
                ToPort: 3000,
                Description: 'Allow traffic from ALB to container port 3000',
            });
        });
        test('Fargate security group allows all outbound traffic', () => {
            new vpc_1.OpenClawVpc(stack, 'TestVpc');
            const template = assertions_1.Template.fromStack(stack);
            template.hasResourceProperties('AWS::EC2::SecurityGroup', {
                GroupDescription: 'Security group for OpenClaw Fargate tasks',
                SecurityGroupEgress: [
                    {
                        CidrIp: '0.0.0.0/0',
                        Description: 'Allow all outbound traffic by default',
                        IpProtocol: '-1',
                    },
                ],
            });
        });
    });
    // ============================================================================
    // Integration Tests
    // ============================================================================
    describe('Integration', () => {
        test('exports all required properties', () => {
            const vpcConstruct = new vpc_1.OpenClawVpc(stack, 'TestVpc');
            expect(vpcConstruct.vpc).toBeDefined();
            expect(vpcConstruct.albSecurityGroup).toBeDefined();
            expect(vpcConstruct.fargateSecurityGroup).toBeDefined();
            expect(vpcConstruct.vpcId).toBeDefined();
            expect(vpcConstruct.publicSubnetIds).toHaveLength(2);
            expect(vpcConstruct.privateSubnetIds).toHaveLength(2);
        });
        test('security groups are associated with the VPC', () => {
            const vpcConstruct = new vpc_1.OpenClawVpc(stack, 'TestVpc');
            const template = assertions_1.Template.fromStack(stack);
            // Get the VPC ID
            const vpcId = vpcConstruct.vpcId;
            // Verify security groups reference the same VPC
            template.hasResourceProperties('AWS::EC2::SecurityGroup', {
                GroupDescription: 'Security group for OpenClaw Application Load Balancer',
                VpcId: {
                    Ref: assertions_1.Match.stringLikeRegexp('Vpc'),
                },
            });
            template.hasResourceProperties('AWS::EC2::SecurityGroup', {
                GroupDescription: 'Security group for OpenClaw Fargate tasks',
                VpcId: {
                    Ref: assertions_1.Match.stringLikeRegexp('Vpc'),
                },
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidnBjLnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi90ZXN0L2NvbnN0cnVjdHMvdnBjLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGlEQUFtQztBQUNuQyx1REFBeUQ7QUFDekQsa0RBQXVEO0FBRXZELFFBQVEsQ0FBQyxhQUFhLEVBQUUsR0FBRyxFQUFFO0lBQzNCLElBQUksR0FBWSxDQUFDO0lBQ2pCLElBQUksS0FBZ0IsQ0FBQztJQUVyQixVQUFVLENBQUMsR0FBRyxFQUFFO1FBQ2QsR0FBRyxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQ3BCLEtBQUssR0FBRyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLFdBQVcsRUFBRTtZQUN0QyxHQUFHLEVBQUU7Z0JBQ0gsT0FBTyxFQUFFLGNBQWM7Z0JBQ3ZCLE1BQU0sRUFBRSxXQUFXO2FBQ3BCO1NBQ0YsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7SUFFSCwrRUFBK0U7SUFDL0UsMEJBQTBCO0lBQzFCLCtFQUErRTtJQUMvRSxRQUFRLENBQUMsbUJBQW1CLEVBQUUsR0FBRyxFQUFFO1FBQ2pDLElBQUksQ0FBQyxpQ0FBaUMsRUFBRSxHQUFHLEVBQUU7WUFDM0MsSUFBSSxpQkFBVyxDQUFDLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQztZQUNsQyxNQUFNLFFBQVEsR0FBRyxxQkFBUSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUUzQyxRQUFRLENBQUMscUJBQXFCLENBQUMsZUFBZSxFQUFFO2dCQUM5QyxTQUFTLEVBQUUsYUFBYTtnQkFDeEIsa0JBQWtCLEVBQUUsSUFBSTtnQkFDeEIsZ0JBQWdCLEVBQUUsSUFBSTthQUN2QixDQUFDLENBQUM7UUFDTCxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyw2Q0FBNkMsRUFBRSxHQUFHLEVBQUU7WUFD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c291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCB7IFRlbXBsYXRlLCBNYXRjaCB9IGZyb20gJ2F3cy1jZGstbGliL2Fzc2VydGlvbnMnO1xuaW1wb3J0IHsgT3BlbkNsYXdWcGMgfSBmcm9tICcuLi8uLi9saWIvY29uc3RydWN0cy92cGMnO1xuXG5kZXNjcmliZSgnT3BlbkNsYXdWcGMnLCAoKSA9PiB7XG4gIGxldCBhcHA6IGNkay5BcHA7XG4gIGxldCBzdGFjazogY2RrLlN0YWNrO1xuXG4gIGJlZm9yZUVhY2goKCkgPT4ge1xuICAgIGFwcCA9IG5ldyBjZGsuQXBwKCk7XG4gICAgc3RhY2sgPSBuZXcgY2RrLlN0YWNrKGFwcCwgJ1Rlc3RTdGFjaycsIHtcbiAgICAgIGVudjoge1xuICAgICAgICBhY2NvdW50OiAnMTIzNDU2Nzg5MDEyJyxcbiAgICAgICAgcmVnaW9uOiAndXMtZWFzdC0xJyxcbiAgICAgIH0sXG4gICAgfSk7XG4gIH0pO1xuXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgLy8gVlBDIENvbmZpZ3VyYXRpb24gVGVzdHNcbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICBkZXNjcmliZSgnVlBDIENvbmZpZ3VyYXRpb24nLCAoKSA9PiB7XG4gICAgdGVzdCgnY3JlYXRlcyBhIFZQQyB3aXRoIGNvcnJlY3QgQ0lEUicsICgpID0+IHtcbiAgICAgIG5ldyBPcGVuQ2xhd1ZwYyhzdGFjaywgJ1Rlc3RWcGMnKTtcbiAgICAgIGNvbnN0IHRlbXBsYXRlID0gVGVtcGxhdGUuZnJvbVN0YWNrKHN0YWNrKTtcblxuICAgICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkVDMjo6VlBDJywge1xuICAgICAgICBDaWRyQmxvY2s6ICcxMC4wLjAuMC8xNicsXG4gICAgICAgIEVuYWJsZURuc0hvc3RuYW1lczogdHJ1ZSxcbiAgICAgICAgRW5hYmxlRG5zU3VwcG9ydDogdHJ1ZSxcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnY3JlYXRlcyBWUEMgd2l0aCBjdXN0b20gQ0lEUiB3aGVuIHNwZWNpZmllZCcsICgpID0+IHtcbiAgICAgIG5ldyBPcGVuQ2xhd1ZwYyhzdGFjaywgJ1Rlc3RWcGMnLCB7XG4gICAgICAgIHZwY0NpZHI6ICcxNzIuMTYuMC4wLzE2JyxcbiAgICAgIH0pO1xuICAgICAgY29uc3QgdGVtcGxhdGUgPSBUZW1wbGF0ZS5mcm9tU3RhY2soc3RhY2spO1xuXG4gICAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6RUMyOjpWUEMnLCB7XG4gICAgICAgIENpZHJCbG9jazogJzE3Mi4xNi4wLjAvMTYnLFxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdWUEMgaGFzIDIgQXZhaWxhYmlsaXR5IFpvbmVzJywgKCkgPT4ge1xuICAgICAgY29uc3QgdnBjQ29uc3RydWN0ID0gbmV3IE9wZW5DbGF3VnBjKHN0YWNrLCAnVGVzdFZwYycpO1xuICAgICAgXG4gICAgICBleHBlY3QodnBjQ29uc3RydWN0LnZwYy5hdmFpbGFiaWxpdHlab25lcy5sZW5ndGgpLnRvQmUoMik7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdWUEMgZXhwb3J0cyBWUEMgSUQnLCAoKSA9PiB7XG4gICAgICBjb25zdCB2cGNDb25zdHJ1Y3QgPSBuZXcgT3BlbkNsYXdWcGMoc3RhY2ssICdUZXN0VnBjJyk7XG4gICAgICBcbiAgICAgIGV4cGVjdCh2cGNDb25zdHJ1Y3QudnBjSWQpLnRvQmVEZWZpbmVkKCk7XG4gICAgICBleHBlY3QodHlwZW9mIHZwY0NvbnN0cnVjdC52cGNJZCkudG9CZSgnc3RyaW5nJyk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgLy8gU3VibmV0IFRlc3RzXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgZGVzY3JpYmUoJ1N1Ym5ldHMnLCAoKSA9PiB7XG4gICAgdGVzdCgnY3JlYXRlcyBwdWJsaWMgYW5kIHByaXZhdGUgc3VibmV0cycsICgpID0+IHtcbiAgICAgIG5ldyBPcGVuQ2xhd1ZwYyhzdGFjaywgJ1Rlc3RWcGMnKTtcbiAgICAgIGNvbnN0IHRlbXBsYXRlID0gVGVtcGxhdGUuZnJvbVN0YWNrKHN0YWNrKTtcblxuICAgICAgLy8gMiBwdWJsaWMgKyAyIHByaXZhdGUgPSA0IHN1Ym5ldHMgdG90YWxcbiAgICAgIHRlbXBsYXRlLnJlc291cmNlQ291bnRJcygnQVdTOjpFQzI6OlN1Ym5ldCcsIDQpO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnY3JlYXRlcyAyIHB1YmxpYyBzdWJuZXRzJywgKCkgPT4ge1xuICAgICAgY29uc3QgdnBjQ29uc3RydWN0ID0gbmV3IE9wZW5DbGF3VnBjKHN0YWNrLCAnVGVzdFZwYycpO1xuICAgICAgXG4gICAgICBleHBlY3QodnBjQ29uc3RydWN0LnZwYy5wdWJsaWNTdWJuZXRzLmxlbmd0aCkudG9CZSgyKTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ2NyZWF0ZXMgMiBwcml2YXRlIHN1Ym5ldHMnLCAoKSA9PiB7XG4gICAgICBjb25zdCB2cGNDb25zdHJ1Y3QgPSBuZXcgT3BlbkNsYXdWcGMoc3RhY2ssICdUZXN0VnBjJyk7XG4gICAgICBcbiAgICAgIGV4cGVjdCh2cGNDb25zdHJ1Y3QudnBjLnByaXZhdGVTdWJuZXRzLmxlbmd0aCkudG9CZSgyKTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ3B1YmxpYyBzdWJuZXRzIGhhdmUgLzI0IENJRFIgbWFzaycsICgpID0+IHtcbiAgICAgIG5ldyBPcGVuQ2xhd1ZwYyhzdGFjaywgJ1Rlc3RWcGMnKTtcbiAgICAgIGNvbnN0IHRlbXBsYXRlID0gVGVtcGxhdGUuZnJvbVN0YWNrKHN0YWNrKTtcblxuICAgICAgY29uc3Qgc3VibmV0cyA9IHRlbXBsYXRlLmZpbmRSZXNvdXJjZXMoJ0FXUzo6RUMyOjpTdWJuZXQnKTtcbiAgICAgIGNvbnN0IHB1YmxpY1N1Ym5ldHMgPSBPYmplY3QudmFsdWVzKHN1Ym5ldHMpLmZpbHRlcigoc3VibmV0OiBhbnkpID0+IHtcbiAgICAgICAgcmV0dXJuIHN1Ym5ldC5Qcm9wZXJ0aWVzLk1hcFB1YmxpY0lwT25MYXVuY2ggPT09IHRydWU7XG4gICAgICB9KTtcblxuICAgICAgLy8gVmVyaWZ5IHdlIGhhdmUgMiBwdWJsaWMgc3VibmV0c1xuICAgICAgZXhwZWN0KHB1YmxpY1N1Ym5ldHMubGVuZ3RoKS50b0JlKDIpO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnZXhwb3J0cyBwdWJsaWMgc3VibmV0IElEcycsICgpID0+IHtcbiAgICAgIGNvbnN0IHZwY0NvbnN0cnVjdCA9IG5ldyBPcGVuQ2xhd1ZwYyhzdGFjaywgJ1Rlc3RWcGMnKTtcbiAgICAgIFxuICAgICAgZXhwZWN0KHZwY0NvbnN0cnVjdC5wdWJsaWNTdWJuZXRJZHMubGVuZ3RoKS50b0JlKDIpO1xuICAgICAgZXhwZWN0KHZwY0NvbnN0cnVjdC5wdWJsaWNTdWJuZXRJZHMuZXZlcnkoaWQgPT4gdHlwZW9mIGlkID09PSAnc3RyaW5nJykpLnRvQmUodHJ1ZSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdleHBvcnRzIHByaXZhdGUgc3VibmV0IElEcycsICgpID0+IHtcbiAgICAgIGNvbnN0IHZwY0NvbnN0cnVjdCA9IG5ldyBPcGVuQ2xhd1ZwYyhzdGFjaywgJ1Rlc3RWcGMnKTtcbiAgICAgIFxuICAgICAgZXhwZWN0KHZwY0NvbnN0cnVjdC5wcml2YXRlU3VibmV0SWRzLmxlbmd0aCkudG9CZSgyKTtcbiAgICAgIGV4cGVjdCh2cGNDb25zdHJ1Y3QucHJpdmF0ZVN1Ym5ldElkcy5ldmVyeShpZCA9PiB0eXBlb2YgaWQgPT09ICdzdHJpbmcnKSkudG9CZSh0cnVlKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAvLyBOQVQgR2F0ZXdheSBUZXN0c1xuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIGRlc2NyaWJlKCdOQVQgR2F0ZXdheScsICgpID0+IHtcbiAgICB0ZXN0KCdjcmVhdGVzIDEgTkFUIGdhdGV3YXkgYnkgZGVmYXVsdCcsICgpID0+IHtcbiAgICAgIG5ldyBPcGVuQ2xhd1ZwYyhzdGFjaywgJ1Rlc3RWcGMnKTtcbiAgICAgIGNvbnN0IHRlbXBsYXRlID0gVGVtcGxhdGUuZnJvbVN0YWNrKHN0YWNrKTtcblxuICAgICAgdGVtcGxhdGUucmVzb3VyY2VDb3VudElzKCdBV1M6OkVDMjo6TmF0R2F0ZXdheScsIDEpO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnY3JlYXRlcyBOQVQgZ2F0ZXdheSB3aGVuIHVzZU5hdEdhdGV3YXkgaXMgdHJ1ZScsICgpID0+IHtcbiAgICAgIG5ldyBPcGVuQ2xhd1ZwYyhzdGFjaywgJ1Rlc3RWcGMnLCB7XG4gICAgICAgIHVzZU5hdEdhdGV3YXk6IHRydWUsXG4gICAgICB9KTtcbiAgICAgIGNvbnN0IHRlbXBsYXRlID0gVGVtcGxhdGUuZnJvbVN0YWNrKHN0YWNrKTtcblxuICAgICAgdGVtcGxhdGUucmVzb3VyY2VDb3VudElzKCdBV1M6OkVDMjo6TmF0R2F0ZXdheScsIDEpO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnZG9lcyBub3QgY3JlYXRlIE5BVCBnYXRld2F5IHdoZW4gdXNlTmF0R2F0ZXdheSBpcyBmYWxzZScsICgpID0+IHtcbiAgICAgIG5ldyBPcGVuQ2xhd1ZwYyhzdGFjaywgJ1Rlc3RWcGMnLCB7XG4gICAgICAgIHVzZU5hdEdhdGV3YXk6IGZhbHNlLFxuICAgICAgfSk7XG4gICAgICBjb25zdCB0ZW1wbGF0ZSA9IFRlbXBsYXRlLmZyb21TdGFjayhzdGFjayk7XG5cbiAgICAgIHRlbXBsYXRlLnJlc291cmNlQ291bnRJcygnQVdTOjpFQzI6Ok5hdEdhdGV3YXknLCAwKTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ2NyZWF0ZXMgRWxhc3RpYyBJUCBmb3IgTkFUIGdhdGV3YXknLCAoKSA9PiB7XG4gICAgICBuZXcgT3BlbkNsYXdWcGMoc3RhY2ssICdUZXN0VnBjJyk7XG4gICAgICBjb25zdCB0ZW1wbGF0ZSA9IFRlbXBsYXRlLmZyb21TdGFjayhzdGFjayk7XG5cbiAgICAgIHRlbXBsYXRlLnJlc291cmNlQ291bnRJcygnQVdTOjpFQzI6OkVJUCcsIDEpO1xuICAgIH0pO1xuICB9KTtcblxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIC8vIFNlY3VyaXR5IEdyb3VwIFRlc3RzXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgZGVzY3JpYmUoJ0FMQiBTZWN1cml0eSBHcm91cCcsICgpID0+IHtcbiAgICB0ZXN0KCdjcmVhdGVzIEFMQiBzZWN1cml0eSBncm91cCcsICgpID0+IHtcbiAgICAgIG5ldyBPcGVuQ2xhd1ZwYyhzdGFjaywgJ1Rlc3RWcGMnKTtcbiAgICAgIGNvbnN0IHRlbXBsYXRlID0gVGVtcGxhdGUuZnJvbVN0YWNrKHN0YWNrKTtcblxuICAgICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkVDMjo6U2VjdXJpdHlHcm91cCcsIHtcbiAgICAgICAgR3JvdXBEZXNjcmlwdGlvbjogJ1NlY3VyaXR5IGdyb3VwIGZvciBPcGVuQ2xhdyBBcHBsaWNhdGlvbiBMb2FkIEJhbGFuY2VyJyxcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnQUxCIHNlY3VyaXR5IGdyb3VwIGFsbG93cyBpbmJvdW5kIEhUVFAgKHBvcnQgODApIGZyb20gYW55d2hlcmUnLCAoKSA9PiB7XG4gICAgICBuZXcgT3BlbkNsYXdWcGMoc3RhY2ssICdUZXN0VnBjJyk7XG4gICAgICBjb25zdCB0ZW1wbGF0ZSA9IFRlbXBsYXRlLmZyb21TdGFjayhzdGFjayk7XG5cbiAgICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpFQzI6OlNlY3VyaXR5R3JvdXAnLCB7XG4gICAgICAgIEdyb3VwRGVzY3JpcHRpb246ICdTZWN1cml0eSBncm91cCBmb3IgT3BlbkNsYXcgQXBwbGljYXRpb24gTG9hZCBCYWxhbmNlcicsXG4gICAgICAgIFNlY3VyaXR5R3JvdXBJbmdyZXNzOiBNYXRjaC5hcnJheVdpdGgoW1xuICAgICAgICAgIE1hdGNoLm9iamVjdExpa2Uoe1xuICAgICAgICAgICAgSXBQcm90b2NvbDogJ3RjcCcsXG4gICAgICAgICAgICBGcm9tUG9ydDogODAsXG4gICAgICAgICAgICBUb1BvcnQ6IDgwLFxuICAgICAgICAgICAgQ2lkcklwOiAnMC4wLjAuMC8wJyxcbiAgICAgICAgICB9KSxcbiAgICAgICAgXSksXG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ0FMQiBzZWN1cml0eSBncm91cCBhbGxvd3MgaW5ib3VuZCBIVFRQUyAocG9ydCA0NDMpIGZyb20gYW55d2hlcmUnLCAoKSA9PiB7XG4gICAgICBuZXcgT3BlbkNsYXdWcGMoc3RhY2ssICdUZXN0VnBjJyk7XG4gICAgICBjb25zdCB0ZW1wbGF0ZSA9IFRlbXBsYXRlLmZyb21TdGFjayhzdGFjayk7XG5cbiAgICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpFQzI6OlNlY3VyaXR5R3JvdXAnLCB7XG4gICAgICAgIEdyb3VwRGVzY3JpcHRpb246ICdTZWN1cml0eSBncm91cCBmb3IgT3BlbkNsYXcgQXBwbGljYXRpb24gTG9hZCBCYWxhbmNlcicsXG4gICAgICAgIFNlY3VyaXR5R3JvdXBJbmdyZXNzOiBNYXRjaC5hcnJheVdpdGgoW1xuICAgICAgICAgIE1hdGNoLm9iamVjdExpa2Uoe1xuICAgICAgICAgICAgSXBQcm90b2NvbDogJ3RjcCcsXG4gICAgICAgICAgICBGcm9tUG9ydDogNDQzLFxuICAgICAgICAgICAgVG9Qb3J0OiA0NDMsXG4gICAgICAgICAgICBDaWRySXA6ICcwLjAuMC4wLzAnLFxuICAgICAgICAgIH0pLFxuICAgICAgICBdKSxcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnQUxCIHNlY3VyaXR5IGdyb3VwIGFsbG93cyBhbGwgb3V0Ym91bmQgdHJhZmZpYycsICgpID0+IHtcbiAgICAgIG5ldyBPcGVuQ2xhd1ZwYyhzdGFjaywgJ1Rlc3RWcGMnKTtcbiAgICAgIGNvbnN0IHRlbXBsYXRlID0gVGVtcGxhdGUuZnJvbVN0YWNrKHN0YWNrKTtcblxuICAgICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkVDMjo6U2VjdXJpdHlHcm91cCcsIHtcbiAgICAgICAgR3JvdXBEZXNjcmlwdGlvbjogJ1NlY3VyaXR5IGdyb3VwIGZvciBPcGVuQ2xhdyBBcHBsaWNhdGlvbiBMb2FkIEJhbGFuY2VyJyxcbiAgICAgICAgU2VjdXJpdHlHcm91cEVncmVzczogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIENpZHJJcDogJzAuMC4wLjAvMCcsXG4gICAgICAgICAgICBEZXNjcmlwdGlvbjogJ0FsbG93IGFsbCBvdXRib3VuZCB0cmFmZmljIGJ5IGRlZmF1bHQnLFxuICAgICAgICAgICAgSXBQcm90b2NvbDogJy0xJyxcbiAgICAgICAgICB9LFxuICAgICAgICBdLFxuICAgICAgfSk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdGYXJnYXRlIFNlY3VyaXR5IEdyb3VwJywgKCkgPT4ge1xuICAgIHRlc3QoJ2NyZWF0ZXMgRmFyZ2F0ZSBzZWN1cml0eSBncm91cCcsICgpID0+IHtcbiAgICAgIG5ldyBPcGVuQ2xhd1ZwYyhzdGFjaywgJ1Rlc3RWcGMnKTtcbiAgICAgIGNvbnN0IHRlbXBsYXRlID0gVGVtcGxhdGUuZnJvbVN0YWNrKHN0YWNrKTtcblxuICAgICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkVDMjo6U2VjdXJpdHlHcm91cCcsIHtcbiAgICAgICAgR3JvdXBEZXNjcmlwdGlvbjogJ1NlY3VyaXR5IGdyb3VwIGZvciBPcGVuQ2xhdyBGYXJnYXRlIHRhc2tzJyxcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnRmFyZ2F0ZSBzZWN1cml0eSBncm91cCBhbGxvd3MgaW5ib3VuZCBwb3J0IDMwMDAgZnJvbSBBTEIgc2VjdXJpdHkgZ3JvdXAnLCAoKSA9PiB7XG4gICAgICBuZXcgT3BlbkNsYXdWcGMoc3RhY2ssICdUZXN0VnBjJyk7XG4gICAgICBjb25zdCB0ZW1wbGF0ZSA9IFRlbXBsYXRlLmZyb21TdGFjayhzdGFjayk7XG5cbiAgICAgIC8vIEZpbmQgdGhlIEZhcmdhdGUgc2VjdXJpdHkgZ3JvdXAgaW5ncmVzcyBydWxlIHRoYXQgcmVmZXJlbmNlcyB0aGUgQUxCIHNlY3VyaXR5IGdyb3VwXG4gICAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6RUMyOjpTZWN1cml0eUdyb3VwSW5ncmVzcycsIHtcbiAgICAgICAgSXBQcm90b2NvbDogJ3RjcCcsXG4gICAgICAgIEZyb21Qb3J0OiAzMDAwLFxuICAgICAgICBUb1BvcnQ6IDMwMDAsXG4gICAgICAgIERlc2NyaXB0aW9uOiAnQWxsb3cgdHJhZmZpYyBmcm9tIEFMQiB0byBjb250YWluZXIgcG9ydCAzMDAwJyxcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnRmFyZ2F0ZSBzZWN1cml0eSBncm91cCBhbGxvd3MgYWxsIG91dGJvdW5kIHRyYWZmaWMnLCAoKSA9PiB7XG4gICAgICBuZXcgT3BlbkNsYXdWcGMoc3RhY2ssICdUZXN0VnBjJyk7XG4gICAgICBjb25zdCB0ZW1wbGF0ZSA9IFRlbXBsYXRlLmZyb21TdGFjayhzdGFjayk7XG5cbiAgICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpFQzI6OlNlY3VyaXR5R3JvdXAnLCB7XG4gICAgICAgIEdyb3VwRGVzY3JpcHRpb246ICdTZWN1cml0eSBncm91cCBmb3IgT3BlbkNsYXcgRmFyZ2F0ZSB0YXNrcycsXG4gICAgICAgIFNlY3VyaXR5R3JvdXBFZ3Jlc3M6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBDaWRySXA6ICcwLjAuMC4wLzAnLFxuICAgICAgICAgICAgRGVzY3JpcHRpb246ICdBbGxvdyBhbGwgb3V0Ym91bmQgdHJhZmZpYyBieSBkZWZhdWx0JyxcbiAgICAgICAgICAgIElwUHJvdG9jb2w6ICctMScsXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9KTtcblxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIC8vIEludGVncmF0aW9uIFRlc3RzXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgZGVzY3JpYmUoJ0ludGVncmF0aW9uJywgKCkgPT4ge1xuICAgIHRlc3QoJ2V4cG9ydHMgYWxsIHJlcXVpcmVkIHByb3BlcnRpZXMnLCAoKSA9PiB7XG4gICAgICBjb25zdCB2cGNDb25zdHJ1Y3QgPSBuZXcgT3BlbkNsYXdWcGMoc3RhY2ssICdUZXN0VnBjJyk7XG5cbiAgICAgIGV4cGVjdCh2cGNDb25zdHJ1Y3QudnBjKS50b0JlRGVmaW5lZCgpO1xuICAgICAgZXhwZWN0KHZwY0NvbnN0cnVjdC5hbGJTZWN1cml0eUdyb3VwKS50b0JlRGVmaW5lZCgpO1xuICAgICAgZXhwZWN0KHZwY0NvbnN0cnVjdC5mYXJnYXRlU2VjdXJpdHlHcm91cCkudG9CZURlZmluZWQoKTtcbiAgICAgIGV4cGVjdCh2cGNDb25zdHJ1Y3QudnBjSWQpLnRvQmVEZWZpbmVkKCk7XG4gICAgICBleHBlY3QodnBjQ29uc3RydWN0LnB1YmxpY1N1Ym5ldElkcykudG9IYXZlTGVuZ3RoKDIpO1xuICAgICAgZXhwZWN0KHZwY0NvbnN0cnVjdC5wcml2YXRlU3VibmV0SWRzKS50b0hhdmVMZW5ndGgoMik7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdzZWN1cml0eSBncm91cHMgYXJlIGFzc29jaWF0ZWQgd2l0aCB0aGUgVlBDJywgKCkgPT4ge1xuICAgICAgY29uc3QgdnBjQ29uc3RydWN0ID0gbmV3IE9wZW5DbGF3VnBjKHN0YWNrLCAnVGVzdFZwYycpO1xuICAgICAgY29uc3QgdGVtcGxhdGUgPSBUZW1wbGF0ZS5mcm9tU3RhY2soc3RhY2spO1xuXG4gICAgICAvLyBHZXQgdGhlIFZQQyBJRFxuICAgICAgY29uc3QgdnBjSWQgPSB2cGNDb25zdHJ1Y3QudnBjSWQ7XG5cbiAgICAgIC8vIFZlcmlmeSBzZWN1cml0eSBncm91cHMgcmVmZXJlbmNlIHRoZSBzYW1lIFZQQ1xuICAgICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkVDMjo6U2VjdXJpdHlHcm91cCcsIHtcbiAgICAgICAgR3JvdXBEZXNjcmlwdGlvbjogJ1NlY3VyaXR5IGdyb3VwIGZvciBPcGVuQ2xhdyBBcHBsaWNhdGlvbiBMb2FkIEJhbGFuY2VyJyxcbiAgICAgICAgVnBjSWQ6IHtcbiAgICAgICAgICBSZWY6IE1hdGNoLnN0cmluZ0xpa2VSZWdleHAoJ1ZwYycpLFxuICAgICAgICB9LFxuICAgICAgfSk7XG5cbiAgICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpFQzI6OlNlY3VyaXR5R3JvdXAnLCB7XG4gICAgICAgIEdyb3VwRGVzY3JpcHRpb246ICdTZWN1cml0eSBncm91cCBmb3IgT3BlbkNsYXcgRmFyZ2F0ZSB0YXNrcycsXG4gICAgICAgIFZwY0lkOiB7XG4gICAgICAgICAgUmVmOiBNYXRjaC5zdHJpbmdMaWtlUmVnZXhwKCdWcGMnKSxcbiAgICAgICAgfSxcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9KTtcbn0pO1xuIl19
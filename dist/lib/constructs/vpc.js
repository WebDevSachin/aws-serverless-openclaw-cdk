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
exports.OpenClawVpc = void 0;
const ec2 = __importStar(require("aws-cdk-lib/aws-ec2"));
const constructs_1 = require("constructs");
const config_1 = require("../config");
/**
 * VPC construct for OpenClaw deployment
 *
 * Creates:
 * - VPC with 2 Availability Zones
 * - Public subnets for ALB (2 subnets)
 * - Private subnets with egress for Fargate tasks (2 subnets)
 * - NAT Gateway for outbound internet access from private subnets
 * - Security groups with minimal access
 */
class OpenClawVpc extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        const useNatGateway = props?.useNatGateway ?? true;
        const usePublicSubnets = props?.usePublicSubnets ?? false;
        const vpcCidr = props?.vpcCidr ?? config_1.DEFAULT_NETWORKING_CONFIG.vpcCidr ?? '10.0.0.0/16';
        const maxAzs = props?.maxAzs ?? config_1.DEFAULT_NETWORKING_CONFIG.maxAzs ?? 2;
        const natGateways = useNatGateway
            ? (props?.natGateways ?? config_1.DEFAULT_NETWORKING_CONFIG.natGateways ?? 1)
            : 0;
        // ============================================================
        // VPC
        // ============================================================
        // When not using NAT Gateway and using public subnets for tasks,
        // we only need public subnets (cost optimization)
        const subnetConfiguration = [
            {
                cidrMask: 24,
                name: 'Public',
                subnetType: ec2.SubnetType.PUBLIC,
            },
        ];
        // Only add private subnets if using NAT Gateway
        if (useNatGateway) {
            subnetConfiguration.push({
                cidrMask: 24,
                name: 'Private',
                subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
            });
        }
        this.vpc = new ec2.Vpc(this, 'Vpc', {
            ipAddresses: ec2.IpAddresses.cidr(vpcCidr),
            maxAzs: maxAzs,
            natGateways: natGateways,
            subnetConfiguration,
        });
        // ============================================================
        // Security Groups
        // ============================================================
        // ALB Security Group - allows inbound HTTP/HTTPS from anywhere
        this.albSecurityGroup = new ec2.SecurityGroup(this, 'AlbSecurityGroup', {
            vpc: this.vpc,
            description: 'Security group for OpenClaw Application Load Balancer',
            allowAllOutbound: true,
        });
        // Inbound: Port 80 from 0.0.0.0/0
        this.albSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'Allow HTTP traffic from anywhere');
        // Inbound: Port 443 from 0.0.0.0/0
        this.albSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), 'Allow HTTPS traffic from anywhere');
        // Fargate Security Group - allows inbound only from ALB
        this.fargateSecurityGroup = new ec2.SecurityGroup(this, 'FargateSecurityGroup', {
            vpc: this.vpc,
            description: 'Security group for OpenClaw Fargate tasks',
            allowAllOutbound: true,
        });
        // Inbound: Port 3000 from ALB security group only
        this.fargateSecurityGroup.addIngressRule(this.albSecurityGroup, ec2.Port.tcp(3000), 'Allow traffic from ALB to container port 3000');
    }
    /**
     * Get the public subnet IDs
     */
    get publicSubnetIds() {
        return this.vpc.publicSubnets.map(subnet => subnet.subnetId);
    }
    /**
     * Get the private subnet IDs
     */
    get privateSubnetIds() {
        return this.vpc.privateSubnets.map(subnet => subnet.subnetId);
    }
    /**
     * Get the VPC ID
     */
    get vpcId() {
        return this.vpc.vpcId;
    }
}
exports.OpenClawVpc = OpenClawVpc;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidnBjLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vbGliL2NvbnN0cnVjdHMvdnBjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEseURBQTJDO0FBQzNDLDJDQUF1QztBQUN2QyxzQ0FBc0Q7QUF1Q3REOzs7Ozs7Ozs7R0FTRztBQUNILE1BQWEsV0FBWSxTQUFRLHNCQUFTO0lBa0J4QyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQXdCO1FBQ2hFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFakIsTUFBTSxhQUFhLEdBQUcsS0FBSyxFQUFFLGFBQWEsSUFBSSxJQUFJLENBQUM7UUFDbkQsTUFBTSxnQkFBZ0IsR0FBRyxLQUFLLEVBQUUsZ0JBQWdCLElBQUksS0FBSyxDQUFDO1FBQzFELE1BQU0sT0FBTyxHQUFHLEtBQUssRUFBRSxPQUFPLElBQUksa0NBQXlCLENBQUMsT0FBTyxJQUFJLGFBQWEsQ0FBQztRQUNyRixNQUFNLE1BQU0sR0FBRyxLQUFLLEVBQUUsTUFBTSxJQUFJLGtDQUF5QixDQUFDLE1BQU0sSUFBSSxDQUFDLENBQUM7UUFDdEUsTUFBTSxXQUFXLEdBQUcsYUFBYTtZQUMvQixDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsV0FBVyxJQUFJLGtDQUF5QixDQUFDLFdBQVcsSUFBSSxDQUFDLENBQUM7WUFDcEUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVOLCtEQUErRDtRQUMvRCxNQUFNO1FBQ04sK0RBQStEO1FBQy9ELGlFQUFpRTtRQUNqRSxrREFBa0Q7UUFDbEQsTUFBTSxtQkFBbUIsR0FBOEI7WUFDckQ7Z0JBQ0UsUUFBUSxFQUFFLEVBQUU7Z0JBQ1osSUFBSSxFQUFFLFFBQVE7Z0JBQ2QsVUFBVSxFQUFFLEdBQUcsQ0FBQyxVQUFVLENBQUMsTUFBTTthQUNsQztTQUNGLENBQUM7UUFFRixnREFBZ0Q7UUFDaEQsSUFBSSxhQUFhLEVBQUUsQ0FBQztZQUNsQixtQkFBbUIsQ0FBQyxJQUFJLENBQUM7Z0JBQ3ZCLFFBQVEsRUFBRSxFQUFFO2dCQUNaLElBQUksRUFBRSxTQUFTO2dCQUNmLFVBQVUsRUFBRSxHQUFHLENBQUMsVUFBVSxDQUFDLG1CQUFtQjthQUMvQyxDQUFDLENBQUM7UUFDTCxDQUFDO1FBRUQsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRTtZQUNsQyxXQUFXLEVBQUUsR0FBRyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDO1lBQzFDLE1BQU0sRUFBRSxNQUFNO1lBQ2QsV0FBVyxFQUFFLFdBQVc7WUFDeEIsbUJBQW1CO1NBQ3BCLENBQUMsQ0FBQztRQUVILCtEQUErRDtRQUMvRCxrQkFBa0I7UUFDbEIsK0RBQStEO1FBRS9ELCtEQUErRDtRQUMvRCxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxHQUFHLENBQUMsYUFBYSxDQUFDLElBQUksRUFBRSxrQkFBa0IsRUFBRTtZQUN0RSxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUc7WUFDYixXQUFXLEVBQUUsdURBQXVEO1lBQ3BFLGdCQUFnQixFQUFFLElBQUk7U0FDdkIsQ0FBQyxDQUFDO1FBRUgsa0NBQWtDO1FBQ2xDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxjQUFjLENBQ2xDLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEVBQ2xCLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUNoQixrQ0FBa0MsQ0FDbkMsQ0FBQztRQUVGLG1DQUFtQztRQUNuQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsY0FBYyxDQUNsQyxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxFQUNsQixHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFDakIsbUNBQW1DLENBQ3BDLENBQUM7UUFFRix3REFBd0Q7UUFDeEQsSUFBSSxDQUFDLG9CQUFvQixHQUFHLElBQUksR0FBRyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEVBQUUsc0JBQXNCLEVBQUU7WUFDOUUsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHO1lBQ2IsV0FBVyxFQUFFLDJDQUEyQztZQUN4RCxnQkFBZ0IsRUFBRSxJQUFJO1NBQ3ZCLENBQUMsQ0FBQztRQUVILGtEQUFrRDtRQUNsRCxJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUN0QyxJQUFJLENBQUMsZ0JBQWdCLEVBQ3JCLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUNsQiwrQ0FBK0MsQ0FDaEQsQ0FBQztJQUNKLENBQUM7SUFFRDs7T0FFRztJQUNILElBQVcsZUFBZTtRQUN4QixPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUMvRCxDQUFDO0lBRUQ7O09BRUc7SUFDSCxJQUFXLGdCQUFnQjtRQUN6QixPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUNoRSxDQUFDO0lBRUQ7O09BRUc7SUFDSCxJQUFXLEtBQUs7UUFDZCxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDO0lBQ3hCLENBQUM7Q0FDRjtBQXRIRCxrQ0FzSEMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBlYzIgZnJvbSAnYXdzLWNkay1saWIvYXdzLWVjMic7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcbmltcG9ydCB7IERFRkFVTFRfTkVUV09SS0lOR19DT05GSUcgfSBmcm9tICcuLi9jb25maWcnO1xuXG4vKipcbiAqIFByb3BlcnRpZXMgZm9yIHRoZSBPcGVuQ2xhd1ZwYyBjb25zdHJ1Y3RcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBPcGVuQ2xhd1ZwY1Byb3BzIHtcbiAgLyoqXG4gICAqIFdoZXRoZXIgdG8gY3JlYXRlIGEgTkFUIEdhdGV3YXkgZm9yIG91dGJvdW5kIGludGVybmV0IGFjY2VzcyBmcm9tIHByaXZhdGUgc3VibmV0c1xuICAgKiBAZGVmYXVsdCB0cnVlXG4gICAqL1xuICByZWFkb25seSB1c2VOYXRHYXRld2F5PzogYm9vbGVhbjtcblxuICAvKipcbiAgICogV2hldGhlciB0byB1c2UgcHVibGljIHN1Ym5ldHMgZm9yIEZhcmdhdGUgdGFza3MgKGluc3RlYWQgb2YgcHJpdmF0ZSBzdWJuZXRzKVxuICAgKiBUaGlzIGlzIGEgY29zdCBvcHRpbWl6YXRpb24gb3B0aW9uIHRoYXQgc2F2ZXMgfiQzMi9tb250aCBieSBub3QgdXNpbmcgTkFUIEdhdGV3YXkuXG4gICAqIFRhc2tzIHdpbGwgaGF2ZSBwdWJsaWMgSVBzIGJ1dCBhcmUgc3RpbGwgc2VjdXJlZCBieSBzZWN1cml0eSBncm91cHMuXG4gICAqIEBkZWZhdWx0IGZhbHNlICh1c2UgcHJpdmF0ZSBzdWJuZXRzKVxuICAgKi9cbiAgcmVhZG9ubHkgdXNlUHVibGljU3VibmV0cz86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIFRoZSBWUEMgQ0lEUiBibG9ja1xuICAgKiBAZGVmYXVsdCAnMTAuMC4wLjAvMTYnXG4gICAqL1xuICByZWFkb25seSB2cGNDaWRyPzogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBNYXhpbXVtIG51bWJlciBvZiBBdmFpbGFiaWxpdHkgWm9uZXNcbiAgICogQGRlZmF1bHQgMlxuICAgKi9cbiAgcmVhZG9ubHkgbWF4QXpzPzogbnVtYmVyO1xuXG4gIC8qKlxuICAgKiBOdW1iZXIgb2YgTkFUIGdhdGV3YXlzIHRvIGNyZWF0ZVxuICAgKiBAZGVmYXVsdCAxXG4gICAqL1xuICByZWFkb25seSBuYXRHYXRld2F5cz86IG51bWJlcjtcbn1cblxuLyoqXG4gKiBWUEMgY29uc3RydWN0IGZvciBPcGVuQ2xhdyBkZXBsb3ltZW50XG4gKiBcbiAqIENyZWF0ZXM6XG4gKiAtIFZQQyB3aXRoIDIgQXZhaWxhYmlsaXR5IFpvbmVzXG4gKiAtIFB1YmxpYyBzdWJuZXRzIGZvciBBTEIgKDIgc3VibmV0cylcbiAqIC0gUHJpdmF0ZSBzdWJuZXRzIHdpdGggZWdyZXNzIGZvciBGYXJnYXRlIHRhc2tzICgyIHN1Ym5ldHMpXG4gKiAtIE5BVCBHYXRld2F5IGZvciBvdXRib3VuZCBpbnRlcm5ldCBhY2Nlc3MgZnJvbSBwcml2YXRlIHN1Ym5ldHNcbiAqIC0gU2VjdXJpdHkgZ3JvdXBzIHdpdGggbWluaW1hbCBhY2Nlc3NcbiAqL1xuZXhwb3J0IGNsYXNzIE9wZW5DbGF3VnBjIGV4dGVuZHMgQ29uc3RydWN0IHtcbiAgLyoqXG4gICAqIFRoZSBWUEMgcmVzb3VyY2VcbiAgICovXG4gIHB1YmxpYyByZWFkb25seSB2cGM6IGVjMi5JVnBjO1xuXG4gIC8qKlxuICAgKiBTZWN1cml0eSBncm91cCBmb3IgdGhlIEFwcGxpY2F0aW9uIExvYWQgQmFsYW5jZXJcbiAgICogQWxsb3dzIGluYm91bmQgSFRUUCAoODApIGFuZCBIVFRQUyAoNDQzKSBmcm9tIGFueXdoZXJlXG4gICAqL1xuICBwdWJsaWMgcmVhZG9ubHkgYWxiU2VjdXJpdHlHcm91cDogZWMyLklTZWN1cml0eUdyb3VwO1xuXG4gIC8qKlxuICAgKiBTZWN1cml0eSBncm91cCBmb3IgRmFyZ2F0ZSB0YXNrc1xuICAgKiBBbGxvd3MgaW5ib3VuZCBwb3J0IDMwMDAgb25seSBmcm9tIEFMQiBzZWN1cml0eSBncm91cFxuICAgKi9cbiAgcHVibGljIHJlYWRvbmx5IGZhcmdhdGVTZWN1cml0eUdyb3VwOiBlYzIuSVNlY3VyaXR5R3JvdXA7XG5cbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM/OiBPcGVuQ2xhd1ZwY1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkKTtcblxuICAgIGNvbnN0IHVzZU5hdEdhdGV3YXkgPSBwcm9wcz8udXNlTmF0R2F0ZXdheSA/PyB0cnVlO1xuICAgIGNvbnN0IHVzZVB1YmxpY1N1Ym5ldHMgPSBwcm9wcz8udXNlUHVibGljU3VibmV0cyA/PyBmYWxzZTtcbiAgICBjb25zdCB2cGNDaWRyID0gcHJvcHM/LnZwY0NpZHIgPz8gREVGQVVMVF9ORVRXT1JLSU5HX0NPTkZJRy52cGNDaWRyID8/ICcxMC4wLjAuMC8xNic7XG4gICAgY29uc3QgbWF4QXpzID0gcHJvcHM/Lm1heEF6cyA/PyBERUZBVUxUX05FVFdPUktJTkdfQ09ORklHLm1heEF6cyA/PyAyO1xuICAgIGNvbnN0IG5hdEdhdGV3YXlzID0gdXNlTmF0R2F0ZXdheVxuICAgICAgPyAocHJvcHM/Lm5hdEdhdGV3YXlzID8/IERFRkFVTFRfTkVUV09SS0lOR19DT05GSUcubmF0R2F0ZXdheXMgPz8gMSlcbiAgICAgIDogMDtcblxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8vIFZQQ1xuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8vIFdoZW4gbm90IHVzaW5nIE5BVCBHYXRld2F5IGFuZCB1c2luZyBwdWJsaWMgc3VibmV0cyBmb3IgdGFza3MsXG4gICAgLy8gd2Ugb25seSBuZWVkIHB1YmxpYyBzdWJuZXRzIChjb3N0IG9wdGltaXphdGlvbilcbiAgICBjb25zdCBzdWJuZXRDb25maWd1cmF0aW9uOiBlYzIuU3VibmV0Q29uZmlndXJhdGlvbltdID0gW1xuICAgICAge1xuICAgICAgICBjaWRyTWFzazogMjQsXG4gICAgICAgIG5hbWU6ICdQdWJsaWMnLFxuICAgICAgICBzdWJuZXRUeXBlOiBlYzIuU3VibmV0VHlwZS5QVUJMSUMsXG4gICAgICB9LFxuICAgIF07XG5cbiAgICAvLyBPbmx5IGFkZCBwcml2YXRlIHN1Ym5ldHMgaWYgdXNpbmcgTkFUIEdhdGV3YXlcbiAgICBpZiAodXNlTmF0R2F0ZXdheSkge1xuICAgICAgc3VibmV0Q29uZmlndXJhdGlvbi5wdXNoKHtcbiAgICAgICAgY2lkck1hc2s6IDI0LFxuICAgICAgICBuYW1lOiAnUHJpdmF0ZScsXG4gICAgICAgIHN1Ym5ldFR5cGU6IGVjMi5TdWJuZXRUeXBlLlBSSVZBVEVfV0lUSF9FR1JFU1MsXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICB0aGlzLnZwYyA9IG5ldyBlYzIuVnBjKHRoaXMsICdWcGMnLCB7XG4gICAgICBpcEFkZHJlc3NlczogZWMyLklwQWRkcmVzc2VzLmNpZHIodnBjQ2lkciksXG4gICAgICBtYXhBenM6IG1heEF6cyxcbiAgICAgIG5hdEdhdGV3YXlzOiBuYXRHYXRld2F5cyxcbiAgICAgIHN1Ym5ldENvbmZpZ3VyYXRpb24sXG4gICAgfSk7XG5cbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyBTZWN1cml0eSBHcm91cHNcbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuICAgIC8vIEFMQiBTZWN1cml0eSBHcm91cCAtIGFsbG93cyBpbmJvdW5kIEhUVFAvSFRUUFMgZnJvbSBhbnl3aGVyZVxuICAgIHRoaXMuYWxiU2VjdXJpdHlHcm91cCA9IG5ldyBlYzIuU2VjdXJpdHlHcm91cCh0aGlzLCAnQWxiU2VjdXJpdHlHcm91cCcsIHtcbiAgICAgIHZwYzogdGhpcy52cGMsXG4gICAgICBkZXNjcmlwdGlvbjogJ1NlY3VyaXR5IGdyb3VwIGZvciBPcGVuQ2xhdyBBcHBsaWNhdGlvbiBMb2FkIEJhbGFuY2VyJyxcbiAgICAgIGFsbG93QWxsT3V0Ym91bmQ6IHRydWUsXG4gICAgfSk7XG5cbiAgICAvLyBJbmJvdW5kOiBQb3J0IDgwIGZyb20gMC4wLjAuMC8wXG4gICAgdGhpcy5hbGJTZWN1cml0eUdyb3VwLmFkZEluZ3Jlc3NSdWxlKFxuICAgICAgZWMyLlBlZXIuYW55SXB2NCgpLFxuICAgICAgZWMyLlBvcnQudGNwKDgwKSxcbiAgICAgICdBbGxvdyBIVFRQIHRyYWZmaWMgZnJvbSBhbnl3aGVyZSdcbiAgICApO1xuXG4gICAgLy8gSW5ib3VuZDogUG9ydCA0NDMgZnJvbSAwLjAuMC4wLzBcbiAgICB0aGlzLmFsYlNlY3VyaXR5R3JvdXAuYWRkSW5ncmVzc1J1bGUoXG4gICAgICBlYzIuUGVlci5hbnlJcHY0KCksXG4gICAgICBlYzIuUG9ydC50Y3AoNDQzKSxcbiAgICAgICdBbGxvdyBIVFRQUyB0cmFmZmljIGZyb20gYW55d2hlcmUnXG4gICAgKTtcblxuICAgIC8vIEZhcmdhdGUgU2VjdXJpdHkgR3JvdXAgLSBhbGxvd3MgaW5ib3VuZCBvbmx5IGZyb20gQUxCXG4gICAgdGhpcy5mYXJnYXRlU2VjdXJpdHlHcm91cCA9IG5ldyBlYzIuU2VjdXJpdHlHcm91cCh0aGlzLCAnRmFyZ2F0ZVNlY3VyaXR5R3JvdXAnLCB7XG4gICAgICB2cGM6IHRoaXMudnBjLFxuICAgICAgZGVzY3JpcHRpb246ICdTZWN1cml0eSBncm91cCBmb3IgT3BlbkNsYXcgRmFyZ2F0ZSB0YXNrcycsXG4gICAgICBhbGxvd0FsbE91dGJvdW5kOiB0cnVlLFxuICAgIH0pO1xuXG4gICAgLy8gSW5ib3VuZDogUG9ydCAzMDAwIGZyb20gQUxCIHNlY3VyaXR5IGdyb3VwIG9ubHlcbiAgICB0aGlzLmZhcmdhdGVTZWN1cml0eUdyb3VwLmFkZEluZ3Jlc3NSdWxlKFxuICAgICAgdGhpcy5hbGJTZWN1cml0eUdyb3VwLFxuICAgICAgZWMyLlBvcnQudGNwKDMwMDApLFxuICAgICAgJ0FsbG93IHRyYWZmaWMgZnJvbSBBTEIgdG8gY29udGFpbmVyIHBvcnQgMzAwMCdcbiAgICApO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgcHVibGljIHN1Ym5ldCBJRHNcbiAgICovXG4gIHB1YmxpYyBnZXQgcHVibGljU3VibmV0SWRzKCk6IHN0cmluZ1tdIHtcbiAgICByZXR1cm4gdGhpcy52cGMucHVibGljU3VibmV0cy5tYXAoc3VibmV0ID0+IHN1Ym5ldC5zdWJuZXRJZCk7XG4gIH1cblxuICAvKipcbiAgICogR2V0IHRoZSBwcml2YXRlIHN1Ym5ldCBJRHNcbiAgICovXG4gIHB1YmxpYyBnZXQgcHJpdmF0ZVN1Ym5ldElkcygpOiBzdHJpbmdbXSB7XG4gICAgcmV0dXJuIHRoaXMudnBjLnByaXZhdGVTdWJuZXRzLm1hcChzdWJuZXQgPT4gc3VibmV0LnN1Ym5ldElkKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIFZQQyBJRFxuICAgKi9cbiAgcHVibGljIGdldCB2cGNJZCgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLnZwYy52cGNJZDtcbiAgfVxufVxuIl19
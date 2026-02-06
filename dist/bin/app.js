#!/usr/bin/env node
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
const openclaw_stack_1 = require("../lib/openclaw-stack");
const app = new cdk.App();
// Environment configuration
const env = {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
};
// Stack name from context or default
const stackName = app.node.tryGetContext('stackName') || 'OpenClawStack';
// Create the OpenClaw stack
const stack = new openclaw_stack_1.OpenClawStack(app, stackName, {
    env,
    description: 'OpenClaw - Self-hosted autonomous agent platform on AWS',
    // Stack configuration
    cpu: app.node.tryGetContext('cpu') || 512,
    memoryMiB: app.node.tryGetContext('memoryMiB') || 1024,
    bedrockModel: app.node.tryGetContext('bedrockModel') || 'anthropic.claude-3-5-haiku-20241022-v1:0',
    useGraviton: app.node.tryGetContext('useGraviton') === 'true', // Default false for x86_64 compatibility
    // Optional: Custom VPC ID
    vpcId: app.node.tryGetContext('vpcId'),
});
// Add common tags to all resources
cdk.Tags.of(stack).add('Project', 'OpenClaw');
cdk.Tags.of(stack).add('Environment', app.node.tryGetContext('environment') || 'production');
cdk.Tags.of(stack).add('ManagedBy', 'CDK');
// Synthesize the app
app.synth();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vYmluL2FwcC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUNBLGlEQUFtQztBQUNuQywwREFBc0Q7QUFFdEQsTUFBTSxHQUFHLEdBQUcsSUFBSSxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUM7QUFFMUIsNEJBQTRCO0FBQzVCLE1BQU0sR0FBRyxHQUFHO0lBQ1YsT0FBTyxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsbUJBQW1CO0lBQ3hDLE1BQU0sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLGtCQUFrQixJQUFJLFdBQVc7Q0FDdEQsQ0FBQztBQUVGLHFDQUFxQztBQUNyQyxNQUFNLFNBQVMsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxXQUFXLENBQUMsSUFBSSxlQUFlLENBQUM7QUFFekUsNEJBQTRCO0FBQzVCLE1BQU0sS0FBSyxHQUFHLElBQUksOEJBQWEsQ0FBQyxHQUFHLEVBQUUsU0FBUyxFQUFFO0lBQzlDLEdBQUc7SUFDSCxXQUFXLEVBQUUseURBQXlEO0lBRXRFLHNCQUFzQjtJQUN0QixHQUFHLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLElBQUksR0FBRztJQUN6QyxTQUFTLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsV0FBVyxDQUFDLElBQUksSUFBSTtJQUN0RCxZQUFZLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsY0FBYyxDQUFDLElBQUksMENBQTBDO0lBQ2xHLFdBQVcsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxhQUFhLENBQUMsS0FBSyxNQUFNLEVBQUcseUNBQXlDO0lBRXpHLDBCQUEwQjtJQUMxQixLQUFLLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDO0NBQ3ZDLENBQUMsQ0FBQztBQUVILG1DQUFtQztBQUNuQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLFVBQVUsQ0FBQyxDQUFDO0FBQzlDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxhQUFhLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsYUFBYSxDQUFDLElBQUksWUFBWSxDQUFDLENBQUM7QUFDN0YsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRSxLQUFLLENBQUMsQ0FBQztBQUUzQyxxQkFBcUI7QUFDckIsR0FBRyxDQUFDLEtBQUssRUFBRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiIyEvdXNyL2Jpbi9lbnYgbm9kZVxuaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCB7IE9wZW5DbGF3U3RhY2sgfSBmcm9tICcuLi9saWIvb3BlbmNsYXctc3RhY2snO1xuXG5jb25zdCBhcHAgPSBuZXcgY2RrLkFwcCgpO1xuXG4vLyBFbnZpcm9ubWVudCBjb25maWd1cmF0aW9uXG5jb25zdCBlbnYgPSB7XG4gIGFjY291bnQ6IHByb2Nlc3MuZW52LkNES19ERUZBVUxUX0FDQ09VTlQsXG4gIHJlZ2lvbjogcHJvY2Vzcy5lbnYuQ0RLX0RFRkFVTFRfUkVHSU9OIHx8ICd1cy1lYXN0LTEnLFxufTtcblxuLy8gU3RhY2sgbmFtZSBmcm9tIGNvbnRleHQgb3IgZGVmYXVsdFxuY29uc3Qgc3RhY2tOYW1lID0gYXBwLm5vZGUudHJ5R2V0Q29udGV4dCgnc3RhY2tOYW1lJykgfHwgJ09wZW5DbGF3U3RhY2snO1xuXG4vLyBDcmVhdGUgdGhlIE9wZW5DbGF3IHN0YWNrXG5jb25zdCBzdGFjayA9IG5ldyBPcGVuQ2xhd1N0YWNrKGFwcCwgc3RhY2tOYW1lLCB7XG4gIGVudixcbiAgZGVzY3JpcHRpb246ICdPcGVuQ2xhdyAtIFNlbGYtaG9zdGVkIGF1dG9ub21vdXMgYWdlbnQgcGxhdGZvcm0gb24gQVdTJyxcbiAgXG4gIC8vIFN0YWNrIGNvbmZpZ3VyYXRpb25cbiAgY3B1OiBhcHAubm9kZS50cnlHZXRDb250ZXh0KCdjcHUnKSB8fCA1MTIsXG4gIG1lbW9yeU1pQjogYXBwLm5vZGUudHJ5R2V0Q29udGV4dCgnbWVtb3J5TWlCJykgfHwgMTAyNCxcbiAgYmVkcm9ja01vZGVsOiBhcHAubm9kZS50cnlHZXRDb250ZXh0KCdiZWRyb2NrTW9kZWwnKSB8fCAnYW50aHJvcGljLmNsYXVkZS0zLTUtaGFpa3UtMjAyNDEwMjItdjE6MCcsXG4gIHVzZUdyYXZpdG9uOiBhcHAubm9kZS50cnlHZXRDb250ZXh0KCd1c2VHcmF2aXRvbicpID09PSAndHJ1ZScsICAvLyBEZWZhdWx0IGZhbHNlIGZvciB4ODZfNjQgY29tcGF0aWJpbGl0eVxuICBcbiAgLy8gT3B0aW9uYWw6IEN1c3RvbSBWUEMgSURcbiAgdnBjSWQ6IGFwcC5ub2RlLnRyeUdldENvbnRleHQoJ3ZwY0lkJyksXG59KTtcblxuLy8gQWRkIGNvbW1vbiB0YWdzIHRvIGFsbCByZXNvdXJjZXNcbmNkay5UYWdzLm9mKHN0YWNrKS5hZGQoJ1Byb2plY3QnLCAnT3BlbkNsYXcnKTtcbmNkay5UYWdzLm9mKHN0YWNrKS5hZGQoJ0Vudmlyb25tZW50JywgYXBwLm5vZGUudHJ5R2V0Q29udGV4dCgnZW52aXJvbm1lbnQnKSB8fCAncHJvZHVjdGlvbicpO1xuY2RrLlRhZ3Mub2Yoc3RhY2spLmFkZCgnTWFuYWdlZEJ5JywgJ0NESycpO1xuXG4vLyBTeW50aGVzaXplIHRoZSBhcHBcbmFwcC5zeW50aCgpO1xuIl19
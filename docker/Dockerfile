FROM ghcr.io/openclaw/openclaw:latest

USER root

# Install AWS CLI for S3 operations (following best practice of baking deps into image)
RUN apt-get update && apt-get install -y --no-install-recommends \
    awscli \
    jq \
    curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Create .openclaw directory with full permissions (will be EFS mount point)
RUN mkdir -p /home/node/.openclaw && chmod -R 777 /home/node/.openclaw && chown -R node:node /home/node/.openclaw

# Stage default config OUTSIDE the EFS mount path
# EFS mounts at /home/node/.openclaw and hides anything baked in there
# The entrypoint will copy this into the EFS mount on first boot
RUN mkdir -p /opt/openclaw
COPY docker/config/openclaw.json /opt/openclaw/default-config.json
RUN chown node:node /opt/openclaw/default-config.json

# Copy entrypoint script
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Run as node user - EFS access point ensures proper ownership
USER node

# Set OPENCLAW_HOME to /home/node so OpenClaw looks for config at /home/node/.openclaw/
ENV OPENCLAW_HOME=/home/node

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
# OpenClaw gateway loads config from OPENCLAW_HOME/.openclaw/openclaw.json automatically
CMD ["node", "openclaw.mjs", "gateway", "--port", "18789", "--verbose"]

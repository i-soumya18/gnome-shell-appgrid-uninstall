# Security Policy

## Supported Versions

This repository is pre-1.0 and receives security fixes on `main`.

## Reporting a Vulnerability

Please open a private security report by contacting the maintainer directly before public disclosure.

Recommended report details:

- GNOME Shell version
- Ubuntu version
- Reproduction steps
- Impact assessment
- Relevant logs (`journalctl -b | grep AppGridUninstall`)

## Security Design Principles

- No shell command interpolation for uninstall operations
- Use Polkit-backed `pkexec` path for privileged actions
- Protect critical/system applications from uninstall flow
- Keep permissions and install metadata explicit in packaging

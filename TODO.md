## TODO

- Treat q sketches as hostile code at the deployment boundary, not just at the app layer.
- Run q in a dedicated VM or container with no host filesystem mounts and minimal networking.
- Enforce CPU, memory, process-count, and wall-clock limits outside the Node server.
- Use disposable runtimes so each untrusted sketch gets a fresh isolated environment.
- Keep the current websocket and runtime protocol, but move the q process behind that hardened worker boundary.
- Document a deployment profile for internet exposure instead of claiming in-process q is safe.

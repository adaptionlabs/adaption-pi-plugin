# Adaption Provider for pi

Use [Adaption](https://adaptionlabs.ai) models in the [pi](https://pi.dev) coding agent.

The package adds an `adaption` provider to pi. It sends requests to the
Adaption Responses API, so pi's own tools (read, edit, bash) run with
Adaption models such as `glm-5.2`, `deepseek-v4-flash` and `qwen3.8-27b`.

## Installation

You need pi and an Adaption API key (`pt_live_…`) with the `inference:write`
scope.

```bash
pi install git:github.com/adaptionlabs/adaption-pi-plugin
```

To try it once without installing:

```bash
pi -e git:github.com/adaptionlabs/adaption-pi-plugin
```

## Sign in

Start pi, run `/login`, choose **Adaption** and paste your API key. pi checks
the key and stores it in `~/.pi/agent/auth.json`.

Or set the key in your environment:

```bash
export ADAPTION_API_KEY=pt_live_...
```

A key saved with `/login` wins over the environment variable.

## Choose a model

Run `/model` and pick an `adaption/…` model, or start pi with one:

```bash
pi --model adaption/glm-5.2
pi --model adaption/deepseek-v4-flash:high
```

| Model | Context | Images | Thinking levels |
|---|---|---|---|
| `glm-5.2` | 786K | no | off, high, max |
| `glm-5.3-flash` | 1M | no | low, high, max |
| `deepseek-v4-flash` | 1M | no | off, low, high, max |
| `qwen3.8-27b` | 262K | yes | off, low, medium, xhigh |
| `gemma-4-26b-a4b-it` | 256K | yes | — |
| `nemotron-SEA-LION-v4.8-120b-a12b` | 262K | no | — |
| `qwen-SEA-LION-v5-397b-a17b-plus` | 262K | yes | — |

pi shows only the models your key can use. The list updates from the Adaption
API when pi starts. Models that cannot call tools are not listed, because pi
needs tool calls to work.

## Configuration

| Variable | Default | Use |
|---|---|---|
| `ADAPTION_API_KEY` | — | API key, if you do not use `/login` |
| `ADAPTION_BASE_URL` | `https://api.prod.adaptionlabs.ai/api/v1` | Another Adaption environment |

## Development

```bash
npm install
npm run typecheck
npm test
pi -e ./
```

After a change, run `/reload` in a running pi session.

## License

MIT

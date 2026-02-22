declare namespace Cloudflare {
	interface Env {}
}

declare module 'cloudflare:test' {
	interface ProvidedEnv extends Cloudflare.Env {}
}

export async function resolve(specifier, context, next) {
  if (specifier.endsWith('.js') && (specifier.startsWith('./') || specifier.startsWith('../'))) {
    try {
      return await next(specifier.replace(/\.js$/, '.ts'), context);
    } catch {
      // fallback
    }
  }
  return next(specifier, context);
}

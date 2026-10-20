export async function resolve(specifier, context, next) {
  if (specifier.endsWith('.js') && (specifier.startsWith('./') || specifier.startsWith('../'))) {
    try {
      return await next(specifier.replace(/\.js$/, '.ts'), context);
    } catch (err) {
      if (err?.code !== 'ERR_MODULE_NOT_FOUND') {
        throw err;
      }
    }
  }
  return next(specifier, context);
}

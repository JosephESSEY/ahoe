export function getMissingFields(body: any, requiredFields: string[]): string[] {
  return requiredFields.filter(field => !body || body[field] === undefined || body[field] === null || body[field] === '');
}

export function getMissingParams(params: Record<string, any> | null | undefined, requiredFields: string[]): string[] {
  if (!params || typeof params !== 'object') {
    return [...requiredFields];
  }
  
  return requiredFields.filter(field => {
    const value = params[field];
    return value === undefined || value === null || value === '' || !Object.prototype.hasOwnProperty.call(params, field);
  });
}
export function backendProjectHeaders(projectId) {
  const value = typeof projectId === 'string' ? projectId.trim() : '';
  return value ? { 'X-ThinkTank-Project-Id': value } : {};
}

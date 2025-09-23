export const verifySession = async (req: any) => {
  if (!req.session || !req.session.userId) {
    return null;
  }
  return req.session;
};

export const verifySession = async (req) => {
    if (!req.session || !req.session.userId) {
        return null;
    }
    return req.session;
};

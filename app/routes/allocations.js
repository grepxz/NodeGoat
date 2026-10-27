const AllocationsDAO = require("../data/allocations-dao").AllocationsDAO;
const {
    environmentalScripts
} = require("../../config/config");

function AllocationsHandler(db) {
    "use strict";

    const allocationsDAO = new AllocationsDAO(db);

    this.displayAllocations = (req, res, next) => {
        // Fix for A4 Insecure DOR - take user id from the session, never from the URL.
        // The URL param is kept for existing links but must match the logged-in user.
        const {
            userId
        } = req.session;
        if (String(req.params.userId) !== String(userId)) {
            return res.sendStatus(403);
        }

        // Fix for A1 - 2 NoSQL Injection - threshold must be a whole number 0-99
        const {
            threshold
        } = req.query;
        if (threshold !== undefined && threshold !== "" && !/^\d{1,2}$/.test(threshold)) {
            return res.sendStatus(400);
        }

        allocationsDAO.getByUserIdAndThreshold(userId, threshold, (err, allocations) => {
            if (err) return next(err);
            return res.render("allocations", {
                userId,
                allocations,
                environmentalScripts
            });
        });
    };
}

module.exports = AllocationsHandler;

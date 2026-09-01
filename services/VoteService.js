const calculateVoteTotals = ({ votes, totalSize, requiredMajority, weights }) => {
    const voteTotals = {
        '-1': 0,
        '0': 0,
        '1': 0
    };

    let dictatorVoted = false;

    for (const vote of votes) {
        const weight = weights
            ? (weights.users?.[vote.authorId] ?? 0)
            : 1;
        
        if (vote.state !== undefined) {
            voteTotals[vote.state.toString()] += weight;
        }

        if (vote.isDictator && vote.state !== 0) {
            dictatorVoted = true;
        }
    }

    const effectiveSize = totalSize - voteTotals['0'];
    let toPass = Math.ceil(effectiveSize * requiredMajority);

    if (requiredMajority === 0.5 && effectiveSize % 2 === 0) {
        toPass += 1;
    }

    return {
        no: voteTotals['-1'],
        yes: voteTotals['1'],
        abs: voteTotals['0'],
        toPass,
        dictatorVoted
    };
};

const parseMajorityType = (input) => {
    const str = input.trim();

    if (str.endsWith('%')) {
        const number = Number(str.substr(0, str.length - 1));
        if (isNaN(number) || number < 0 || number > 100) {
            throw new Error('Invalid percentage: must be 0-100');
        }
        return number / 100;
    } else if ((str.match(/\//g) || []).length === 1) {
        const [dividend, divisor] = str.split('/').map(Number);
        if (
            !isNaN(dividend) &&
            !isNaN(divisor) &&
            divisor !== 0 &&
            dividend >= 0 &&
            dividend <= divisor
        ) {
            return dividend / divisor;
        }
    }

    throw new Error('Debe haber ingresarse mayoria en porcentaje o fraccion.');
};

module.exports = {
    calculateVoteTotals,
    parseMajorityType
};
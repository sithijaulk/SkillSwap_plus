const crypto = require('crypto');

const md5Hex = (value) => crypto.createHash('md5').update(String(value), 'utf8').digest('hex');

const formatAmount = (amount) => {
    const num = Number(amount);
    if (!Number.isFinite(num)) {
        throw new Error('Invalid amount');
    }
    return num.toFixed(2);
};

const buildPayHereHash = ({ merchantId, merchantSecret, orderId, amount, currency }) => {
    const amountText = formatAmount(amount);
    const secretHash = md5Hex(merchantSecret).toUpperCase();
    const raw = `${merchantId}${orderId}${amountText}${currency}${secretHash}`;
    return md5Hex(raw).toUpperCase();
};

const buildCheckoutFields = ({
    merchantId,
    merchantSecret,
    orderId,
    amount,
    currency,
    returnUrl,
    cancelUrl,
    notifyUrl,
    customer = {},
    items = 'Mentor Payout',
    custom1,
    custom2,
}) => {
    if (!merchantId || !merchantSecret) {
        throw new Error('PayHere is not configured (missing merchant credentials)');
    }

    const firstName = customer.firstName || 'Admin';
    const lastName = customer.lastName || 'User';
    const email = customer.email || 'admin@example.com';
    const phone = customer.phone || '0770000000';

    const fields = {
        merchant_id: merchantId,
        return_url: returnUrl,
        cancel_url: cancelUrl,
        // PayHere commonly expects notify_url to be present; in demo mode we can point it at any valid endpoint.
        notify_url: notifyUrl || returnUrl,
        order_id: orderId,
        items,
        currency,
        amount: formatAmount(amount),
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        address: 'SkillSwap Plus',
        city: 'Colombo',
        country: 'Sri Lanka',
    };

    if (custom1 !== undefined) fields.custom_1 = String(custom1);
    if (custom2 !== undefined) fields.custom_2 = String(custom2);

    fields.hash = buildPayHereHash({
        merchantId,
        merchantSecret,
        orderId: fields.order_id,
        amount: fields.amount,
        currency: fields.currency,
    });

    return fields;
};

module.exports = {
    buildCheckoutFields,
    buildPayHereHash,
};

export const plans = [
  {
    id: 1,
    name: "Trial",
    subscription: {
      monthly: {
        price: "Free",
        type: "monthly",
        trails: "maximum 1000 Tokens",
      },
      yearly: {
        price: "Free",
        trails: "maximum 1000 Tokens",
        type: "yearly",
      },
    },
  },
  {
    id: 2,
    name: "Enterprise",
    subscription: {
      monthly: {
        price: "Call us",
        type: "monthly",
      },
      yearly: {
        price: "Call us",
        trails: "2 months free",
        type: "yearly",
      },
    },
  },
];

export const addOns = [
  {
    id: 1,
    name: "500 Token",
    description: "Extra 500 token to your AI",
    subscription: {
      monthly: {
        price: 1,
        type: "month",
      },
      yearly: {
        price: 10,
        type: "yearly",
      },
    },
  },
  {
    id: 2,
    name: "1.000 Token",
    description: "Extra 1.000 token to your AI",
    subscription: {
      monthly: {
        price: 2,
        type: "month",
      },
      yearly: {
        price: 20,
        type: "yearly",
      },
    },
  },
  {
    id: 3,
    name: "Customizable profile",
    description: "Custom extra token to your AI",
    subscription: {
      monthly: {
        price: "Call",
        type: "month",
      },
      yearly: {
        price: "Call",
        type: "yearly",
      },
    },
  },
];

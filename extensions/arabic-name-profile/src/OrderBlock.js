const API_VERSION = "2026-01";
const METAFIELD_NAMESPACE = "custom";
const METAFIELD_KEY = "arabic_name";

function t(key, replacements) {
  return shopify.i18n.translate(key, replacements);
}

export default async () => {
  let percentComplete = 0;

  try {
    percentComplete = await fetchProfileCompletionPercent();
  } catch {
    percentComplete = 0;
  }

  const isComplete = percentComplete >= 100;
  const tone = isComplete ? "success" : "warning";

  const banner = document.createElement("s-banner");
  banner.setAttribute(
    "heading",
    t(isComplete ? "orderProfile.headingComplete" : "orderProfile.heading"),
  );
  banner.setAttribute("tone", tone);
  banner.setAttribute("dismissible", "");

  const stack = document.createElement("s-stack");
  stack.setAttribute("direction", "block");
  stack.setAttribute("gap", "base");

  const description = document.createElement("s-text");
  description.textContent = t(
    isComplete
      ? "orderProfile.descriptionComplete"
      : "orderProfile.description",
  );

  const progressLabel = document.createElement("s-text");
  progressLabel.textContent = t("orderProfile.progress", {
    percent: percentComplete,
  });

  const progress = document.createElement("s-progress");
  progress.setAttribute("value", String(percentComplete));
  progress.setAttribute("max", "100");
  progress.setAttribute(
    "accessibilityLabel",
    t("orderProfile.progressAccessibility", { percent: percentComplete }),
  );

  const profileButton = document.createElement("s-button");
  profileButton.setAttribute("variant", "primary");
  profileButton.setAttribute("href", "shopify:customer-account/profile");
  profileButton.textContent = t("orderProfile.button");

  stack.appendChild(description);
  stack.appendChild(progressLabel);
  stack.appendChild(progress);
  stack.appendChild(profileButton);
  banner.appendChild(stack);
  document.body.appendChild(banner);
};

async function fetchProfileCompletionPercent() {
  const data = await customerAccountQuery(
    `query ProfileCompletion($identifiers: [HasMetafieldsIdentifier!]!) {
      customer {
        firstName
        lastName
        emailAddress {
          emailAddress
        }
        defaultAddress {
          id
        }
        metafields(identifiers: $identifiers) {
          namespace
          key
          value
        }
      }
    }`,
    {
      identifiers: [
        { namespace: METAFIELD_NAMESPACE, key: METAFIELD_KEY },
      ],
    },
  );

  const customer = data.customer;
  if (!customer) {
    return 0;
  }

  const arabicName = (customer.metafields ?? []).find(
    (entry) =>
      entry != null &&
      entry.namespace === METAFIELD_NAMESPACE &&
      entry.key === METAFIELD_KEY,
  )?.value;

  const checks = [
    Boolean(customer.firstName?.trim()),
    Boolean(customer.lastName?.trim()),
    Boolean(customer.emailAddress?.emailAddress?.trim()),
    Boolean(customer.defaultAddress?.id),
    Boolean(arabicName?.trim()),
  ];

  const completed = checks.filter(Boolean).length;
  return Math.round((completed / checks.length) * 100);
}

async function customerAccountQuery(query, variables) {
  const response = await fetch(
    `shopify://customer-account/api/${API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables }),
    },
  );

  const result = await response.json();

  if (result.errors?.length || !result.data) {
    throw new Error("profile_completion_failed");
  }

  return result.data;
}

const API_VERSION = "2026-01";
const METAFIELD_NAMESPACE = "custom";
const METAFIELD_KEY = "arabic_name";

function t(key) {
  return shopify.i18n.translate(key);
}

export default async () => {
  let customerId = null;
  let initialValue = "";
  let loadError = "";

  try {
    const data = await fetchCustomerArabicName();
    customerId = data.id;

    if (!customerId) {
      throw new Error(t("arabicName.loadError"));
    }

    initialValue = data.value ?? "";
  } catch (err) {
    loadError = getLocalizedError(err, "arabicName.loadError");
  }

  const section = document.createElement("s-section");
  section.setAttribute("heading", t("arabicName.heading"));

  const form = document.createElement("s-form");

  const stack = document.createElement("s-stack");
  stack.setAttribute("direction", "block");
  stack.setAttribute("gap", "base");

  const textField = document.createElement("s-text-field");
  textField.setAttribute("label", t("arabicName.label"));
  textField.setAttribute("name", "arabic_name");
  if (initialValue) {
    textField.setAttribute("value", initialValue);
  }

  let arabicName = initialValue;
  textField.addEventListener("change", (event) => {
    arabicName = event.currentTarget.value ?? "";
  });
  textField.addEventListener("input", (event) => {
    arabicName = event.currentTarget.value ?? "";
  });

  const saveButton = document.createElement("s-button");
  saveButton.setAttribute("type", "submit");
  saveButton.setAttribute("variant", "primary");
  saveButton.textContent = t("arabicName.save");
  if (!customerId) {
    saveButton.setAttribute("disabled", "");
  }

  stack.appendChild(textField);
  stack.appendChild(saveButton);
  form.appendChild(stack);

  let banner = null;

  const showError = (message) => {
    if (banner) {
      banner.remove();
      banner = null;
    }

    if (!message) {
      return;
    }

    banner = document.createElement("s-banner");
    banner.setAttribute("tone", "critical");
    banner.textContent = message;
    stack.insertBefore(banner, saveButton);
  };

  showError(loadError);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!customerId) {
      showError(t("arabicName.loadError"));
      return;
    }

    saveButton.setAttribute("loading", "");
    showError("");

    try {
      await saveArabicName(customerId, arabicName);
      shopify.toast.show(t("arabicName.saved"));
    } catch (err) {
      showError(getLocalizedError(err, "arabicName.saveError"));
    } finally {
      saveButton.removeAttribute("loading");
    }
  });

  section.appendChild(form);
  document.body.appendChild(section);
};

function getLocalizedError(err, fallbackKey) {
  if (err?.localized) {
    return err.message;
  }

  return t(fallbackKey);
}

function createLocalizedError(message) {
  const error = new Error(message);
  error.localized = true;
  return error;
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

  if (result.errors?.length) {
    throw createLocalizedError(t("arabicName.apiError"));
  }

  if (!result.data) {
    throw createLocalizedError(t("arabicName.apiNoData"));
  }

  return result.data;
}

async function fetchCustomerArabicName() {
  const data = await customerAccountQuery(
    `query ArabicName($identifiers: [HasMetafieldsIdentifier!]!) {
      customer {
        id
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

  const metafield = (data.customer?.metafields ?? []).find(
    (entry) =>
      entry != null &&
      entry.namespace === METAFIELD_NAMESPACE &&
      entry.key === METAFIELD_KEY,
  );

  return {
    id: data.customer?.id,
    value: metafield?.value ?? "",
  };
}

async function saveArabicName(customerId, value) {
  const data = await customerAccountQuery(
    `mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields {
          value
        }
        userErrors {
          field
          message
          code
        }
      }
    }`,
    {
      metafields: [
        {
          ownerId: customerId,
          namespace: METAFIELD_NAMESPACE,
          key: METAFIELD_KEY,
          type: "single_line_text_field",
          value: value ?? "",
        },
      ],
    },
  );

  const userErrors = data.metafieldsSet?.userErrors ?? [];

  if (userErrors.length) {
    throw createLocalizedError(t("arabicName.saveError"));
  }
}

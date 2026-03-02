function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringField(errors, path, value) {
  if (typeof value !== "string" || value.trim().length === 0) {
    errors.push(`${path} must be a non-empty string`);
  }
}

function numberRangeField(errors, path, value, min, max) {
  if (typeof value !== "number" || Number.isNaN(value) || value < min || value > max) {
    errors.push(`${path} must be a number in [${min}, ${max}]`);
  }
}

function arrayField(errors, path, value, min = 1) {
  if (!Array.isArray(value) || value.length < min) {
    errors.push(`${path} must be an array with at least ${min} item(s)`);
    return false;
  }
  return true;
}

export function validateLandingPayload(payload) {
  const errors = [];

  if (!isObject(payload)) {
    return ["payload must be an object"];
  }

  if (!isObject(payload.hero)) {
    errors.push("hero must be an object");
  } else {
    stringField(errors, "hero.desktopTitleLine1", payload.hero.desktopTitleLine1);
    stringField(errors, "hero.desktopTitleLine2", payload.hero.desktopTitleLine2);
    stringField(errors, "hero.desktopSubtitle", payload.hero.desktopSubtitle);
    stringField(errors, "hero.desktopSearchPlaceholder", payload.hero.desktopSearchPlaceholder);
    stringField(errors, "hero.desktopImageUrl", payload.hero.desktopImageUrl);
    stringField(errors, "hero.mobileTitle", payload.hero.mobileTitle);
    stringField(errors, "hero.mobileBadge", payload.hero.mobileBadge);
    stringField(errors, "hero.mobileSearchPlaceholder", payload.hero.mobileSearchPlaceholder);
    stringField(errors, "hero.filterAriaLabel", payload.hero.filterAriaLabel);
  }

  if (!isObject(payload.categories)) {
    errors.push("categories must be an object");
  } else {
    stringField(errors, "categories.desktopTitle", payload.categories.desktopTitle);
    stringField(errors, "categories.desktopSubtitle", payload.categories.desktopSubtitle);
    stringField(errors, "categories.desktopViewAllLabel", payload.categories.desktopViewAllLabel);
    stringField(errors, "categories.mobileTitle", payload.categories.mobileTitle);
    stringField(errors, "categories.mobileViewAllLabel", payload.categories.mobileViewAllLabel);
    if (arrayField(errors, "categories.desktopItems", payload.categories.desktopItems)) {
      payload.categories.desktopItems.forEach((item, idx) => {
        if (!isObject(item)) {
          errors.push(`categories.desktopItems[${idx}] must be an object`);
          return;
        }
        stringField(errors, `categories.desktopItems[${idx}].slug`, item.slug);
        stringField(errors, `categories.desktopItems[${idx}].name`, item.name);
        stringField(errors, `categories.desktopItems[${idx}].countLabel`, item.countLabel);
        stringField(errors, `categories.desktopItems[${idx}].iconKey`, item.iconKey);
      });
    }
    if (arrayField(errors, "categories.mobileItems", payload.categories.mobileItems)) {
      payload.categories.mobileItems.forEach((item, idx) => {
        if (!isObject(item)) {
          errors.push(`categories.mobileItems[${idx}] must be an object`);
          return;
        }
        stringField(errors, `categories.mobileItems[${idx}].slug`, item.slug);
        stringField(errors, `categories.mobileItems[${idx}].name`, item.name);
        stringField(errors, `categories.mobileItems[${idx}].iconKey`, item.iconKey);
      });
    }
  }

  if (!isObject(payload.professionals)) {
    errors.push("professionals must be an object");
  } else {
    ["badgeLabel", "title", "subtitle", "verifiedLabel", "ctaLabel"].forEach((key) => {
      stringField(errors, `professionals.${key}`, payload.professionals[key]);
    });
    if (arrayField(errors, "professionals.items", payload.professionals.items)) {
      payload.professionals.items.forEach((item, idx) => {
        if (!isObject(item)) {
          errors.push(`professionals.items[${idx}] must be an object`);
          return;
        }
        stringField(errors, `professionals.items[${idx}].id`, item.id);
        stringField(errors, `professionals.items[${idx}].name`, item.name);
        stringField(errors, `professionals.items[${idx}].title`, item.title);
        stringField(errors, `professionals.items[${idx}].rating`, item.rating);
        stringField(errors, `professionals.items[${idx}].distanceLabel`, item.distanceLabel);
        numberRangeField(errors, `professionals.items[${idx}].jobsCompleted`, item.jobsCompleted, 0, 100);
        numberRangeField(errors, `professionals.items[${idx}].responsiveness`, item.responsiveness, 0, 100);
        numberRangeField(errors, `professionals.items[${idx}].communication`, item.communication, 0, 100);
      });
    }
  }

  if (!isObject(payload.jobs)) {
    errors.push("jobs must be an object");
  } else {
    stringField(errors, "jobs.title", payload.jobs.title);
    stringField(errors, "jobs.subtitle", payload.jobs.subtitle);
    stringField(errors, "jobs.viewAllLabel", payload.jobs.viewAllLabel);
    if (arrayField(errors, "jobs.items", payload.jobs.items)) {
      payload.jobs.items.forEach((item, idx) => {
        if (!isObject(item)) {
          errors.push(`jobs.items[${idx}] must be an object`);
          return;
        }
        ["id", "typeLabel", "budgetLabel", "title", "locationLabel", "actionLabel"].forEach((key) => {
          stringField(errors, `jobs.items[${idx}].${key}`, item[key]);
        });
        stringField(errors, `jobs.items[${idx}].typeTone`, item.typeTone);
      });
    }
  }

  if (!isObject(payload.footer)) {
    errors.push("footer must be an object");
  } else {
    ["brand", "tagline", "copyright", "language", "currency"].forEach((key) => {
      stringField(errors, `footer.${key}`, payload.footer[key]);
    });
    if (arrayField(errors, "footer.columns", payload.footer.columns)) {
      payload.footer.columns.forEach((column, idx) => {
        if (!isObject(column)) {
          errors.push(`footer.columns[${idx}] must be an object`);
          return;
        }
        stringField(errors, `footer.columns[${idx}].title`, column.title);
        if (arrayField(errors, `footer.columns[${idx}].links`, column.links)) {
          column.links.forEach((link, linkIdx) => {
            if (!isObject(link)) {
              errors.push(`footer.columns[${idx}].links[${linkIdx}] must be an object`);
              return;
            }
            stringField(errors, `footer.columns[${idx}].links[${linkIdx}].label`, link.label);
            stringField(errors, `footer.columns[${idx}].links[${linkIdx}].href`, link.href);
          });
        }
      });
    }
    if (arrayField(errors, "footer.mobileLinks", payload.footer.mobileLinks)) {
      payload.footer.mobileLinks.forEach((link, idx) => {
        if (!isObject(link)) {
          errors.push(`footer.mobileLinks[${idx}] must be an object`);
          return;
        }
        stringField(errors, `footer.mobileLinks[${idx}].label`, link.label);
        stringField(errors, `footer.mobileLinks[${idx}].href`, link.href);
      });
    }
  }

  if (!isObject(payload.mobile)) {
    errors.push("mobile must be an object");
  } else {
    [
      "topRatedTitle",
      "topRatedBadge",
      "topRatedJobsCompletedTitle",
      "topRatedResponsivenessTitle",
      "activeJobsTitle",
      "activeJobsFilterLabel",
    ].forEach((key) => stringField(errors, `mobile.${key}`, payload.mobile[key]));

    if (arrayField(errors, "mobile.topRatedItems", payload.mobile.topRatedItems)) {
      payload.mobile.topRatedItems.forEach((item, idx) => {
        if (!isObject(item)) {
          errors.push(`mobile.topRatedItems[${idx}] must be an object`);
          return;
        }
        ["id", "name", "rating", "reviews", "jobsCompletedLabel", "responsivenessLabel", "distanceLabel", "ctaLabel"].forEach((key) => {
          stringField(errors, `mobile.topRatedItems[${idx}].${key}`, item[key]);
        });
        numberRangeField(errors, `mobile.topRatedItems[${idx}].jobsCompletedPct`, item.jobsCompletedPct, 0, 100);
        numberRangeField(errors, `mobile.topRatedItems[${idx}].responsivenessPct`, item.responsivenessPct, 0, 100);
      });
    }

    if (arrayField(errors, "mobile.activeJobItems", payload.mobile.activeJobItems)) {
      payload.mobile.activeJobItems.forEach((item, idx) => {
        if (!isObject(item)) {
          errors.push(`mobile.activeJobItems[${idx}] must be an object`);
          return;
        }
        ["id", "title", "budgetLabel", "locationLabel", "tagLabel", "tagTone", "applicantsLabel", "actionLabel"].forEach((key) => {
          stringField(errors, `mobile.activeJobItems[${idx}].${key}`, item[key]);
        });
      });
    }

    if (arrayField(errors, "mobile.bottomNav", payload.mobile.bottomNav, 4)) {
      payload.mobile.bottomNav.forEach((item, idx) => {
        if (!isObject(item)) {
          errors.push(`mobile.bottomNav[${idx}] must be an object`);
          return;
        }
        stringField(errors, `mobile.bottomNav[${idx}].label`, item.label);
        stringField(errors, `mobile.bottomNav[${idx}].iconKey`, item.iconKey);
      });
    }
  }

  if (!isObject(payload.actions)) {
    errors.push("actions must be an object");
  } else {
    [
      "signInLabel",
      "notificationsLabel",
      "joinNowLabel",
      "searchButtonLabel",
      "categoryViewAllHref",
      "jobsViewAllHref",
      "signInHref",
      "joinNowAuthHref",
      "joinNowGuestHref",
    ].forEach((key) => stringField(errors, `actions.${key}`, payload.actions[key]));
  }

  return errors;
}

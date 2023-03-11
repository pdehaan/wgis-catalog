import fs from "node:fs/promises";

import axios from "axios";
import cheerio from "cheerio";

const CATALOG_URL = "https://wgimprovschool.com/about-catalog";

const $ = await fetchCatalog();
const classes = $("a[id=online] ~ h3 ~ div");

const classMap = new Map();

for (const cls of classes) {
  let [info, instructor, date] = $(cls).children("div");
  const $info = $(info);
  const href = $info.children("a").attr("href");
  const name = $info.text();
  instructor = $(instructor).text();
  date = $(date).text();
  const data = {
    name,
    href: new URL(href, CATALOG_URL).href,
    instructor,
    date: parseClassDate(date),
  };

  const instructorClasses = classMap.get(instructor) || [];
  instructorClasses.push(data);
  classMap.set(instructor, instructorClasses);
}

const instructors = [...classMap.keys()].sort();
for (const instructor of instructors) {
  console.log(`\n${instructor}`);
  for (const c of classMap.get(instructor)) {
    const { name, date} = c;
    console.log(`  [${date.toLocaleDateString()}] ${name}`);
  }
}

async function fetchCatalog() {
  const res = await axios.get(CATALOG_URL);
  const $ = cheerio.load(res.data);
  await fs.writeFile("about-catalog.html", $.html());
  return $;
}

function parseClassDate(str) {
  let [, ...dateParts] = str.trim().split(" ");
  let time = dateParts.at(-1);
  if (!time.includes(":")) {
    time = time.replace(/^(\d+)(am|pm)$/, "$1:00$2");
  }

  dateParts.pop();
  
  time = time.replace(/am$/, "");
  if (time.endsWith("pm")) {
    time = time.replace(/pm$/, "");
    let [h, m] = time.split(":");
    h = Number(h) + 12;
    if (h === 24) {
      h = 12;
    }
    time = [h, m].join(":");
  }
  dateParts.push(time);
  const date = new Date(dateParts.join(" "));
  if (date.getFullYear() < 2020) {
    date.setFullYear(new Date().getFullYear());
  }
  return date;
}

import { useState } from "react";
import { FAMILIES, FAMILY_ORDER, SKILLS, type FamilyKey, type Skill } from "../../data/profile";
import { vars } from "../../lib/css";
import { pad2 } from "../../lib/format";
import { Icon, type IconName } from "../ui/Icon";
import { SectionHeading } from "../ui/SectionHeading";
import "./Skills.css";

const GROUP_META: Record<FamilyKey, { icon: IconName; blurb: string }> = {
  back: { icon: "server", blurb: "APIs, services & data access" },
  front: { icon: "layout", blurb: "Interfaces people enjoy using" },
  lang: { icon: "code", blurb: "What I write every day" },
  data: { icon: "database", blurb: "Relational databases" },
  tools: { icon: "cloud", blurb: "Ship, test & deploy" },
  style: { icon: "brush", blurb: "Styling & templates" },
  craft: { icon: "compass", blurb: "How I work" },
};

const byFamily = (f: FamilyKey) => SKILLS.filter((s) => s.fam === f).sort((a, b) => Number(b.core) - Number(a.core));
const companies = new Set(SKILLS.flatMap((s) => s.used).filter((u) => !/volunteer/i.test(u)));

// Official technology icons from Devicon (MIT licence, https://devicon.dev), loaded from the jsDelivr CDN.
// Skills without an entry here, or whose icon fails to load, keep the two-letter badge.
const DEVICON = "https://cdn.jsdelivr.net/npm/devicon@2/icons/";
const ICONS: Record<string, string> = {
  "C#": "csharp/csharp-original.svg",
  TypeScript: "typescript/typescript-original.svg",
  JavaScript: "javascript/javascript-original.svg",
  HTML5: "html5/html5-original.svg",
  "CSS3 / SCSS": "css3/css3-original.svg",
  PHP: "php/php-original.svg",
  ".NET 8": "dot-net/dot-net-original.svg",
  "ASP.NET Core": "dotnetcore/dotnetcore-original.svg",
  NestJS: "nestjs/nestjs-original.svg",
  "Node.js": "nodejs/nodejs-original.svg",
  Swagger: "swagger/swagger-original.svg",
  Angular: "angular/angular-original.svg",
  React: "react/react-original.svg",
  "Angular Material": "angularmaterial/angularmaterial-original.svg",
  NgRx: "ngrx/ngrx-original.svg",
  RxJS: "rxjs/rxjs-original.svg",
  Ionic: "ionic/ionic-original.svg",
  WordPress: "wordpress/wordpress-plain.svg",
  "MS SQL Server": "microsoftsqlserver/microsoftsqlserver-original.svg",
  PostgreSQL: "postgresql/postgresql-original.svg",
  "Tailwind CSS": "tailwindcss/tailwindcss-original.svg",
  Bootstrap: "bootstrap/bootstrap-original.svg",
  "Sass True": "sass/sass-original.svg",
  Git: "git/git-original.svg",
  Docker: "docker/docker-original.svg",
  "Microsoft Azure": "azure/azure-original.svg",
  "Azure DevOps CI/CD": "azuredevops/azuredevops-original.svg",
  Jest: "jest/jest-plain.svg",
};

/** Logo if one exists and loads, otherwise the two-letter badge */
function TechIcon({ s }: { s: Skill }) {
  const [failed, setFailed] = useState(false);
  const icon = ICONS[s.name];
  if (!icon || failed) return <span className="tech-sym" aria-hidden="true">{s.sym}</span>;
  return (
    <span className="tech-sym has-icon" aria-hidden="true">
      <img src={DEVICON + icon} alt="" width={18} height={18} loading="lazy" onError={() => setFailed(true)} />
    </span>
  );
}

function Tech({ s, onShow }: { s: Skill; onShow: (s: Skill | null) => void }) {
  return (
    <li>
      <button
        type="button"
        className={`tech-pill${s.core ? " core" : ""}`}
        onPointerEnter={() => onShow(s)}
        onPointerLeave={() => onShow(null)}
        onFocus={() => onShow(s)}
        onBlur={() => onShow(null)}
        onClick={() => onShow(s)}
        aria-label={`${s.name}, used at ${s.used.join(", ")}`}
      >
        <TechIcon s={s} />
        <span className="tech-name">{s.name}</span>
      </button>
    </li>
  );
}

function Group({ fam, index }: { fam: FamilyKey; index: number }) {
  const [active, setActive] = useState<Skill | null>(null);
  const meta = GROUP_META[fam], items = byFamily(fam);
  return (
    <article className={`stack-card area-${fam} rv`} style={vars({ "--i": index, "--c": FAMILIES[fam].c })}>
      <header className="stack-head">
        <span className="stack-icon"><Icon name={meta.icon} /></span>
        <div>
          <h3>{FAMILIES[fam].label}</h3>
          <p>{meta.blurb}</p>
        </div>
        <span className="stack-count mono">{pad2(items.length)}</span>
      </header>
      <ul className="tech-list">
        {items.map((s) => <Tech key={s.name} s={s} onShow={setActive} />)}
      </ul>
      <p className="stack-foot" aria-hidden="true">
        {active ? <><b>{active.name}</b> · {active.used.join(", ")}</> : "Hover a technology to see where I used it"}
      </p>
    </article>
  );
}

/** Tech stack grouped by area — main technologies highlighted, details on hover / tap. */
export function Skills() {
  return (
    <section className="section" id="skills" aria-labelledby="skillsTitle">
      <div className="wrap">
        <div className="skills-head">
          <div>
            <SectionHeading id="skillsTitle" index="02" label="Skills" lines={["My tech", <em className="serif">stack.</em>]} />
          </div>
          <dl className="skills-stats rv">
            <div><dt>Technologies</dt><dd>{SKILLS.length}</dd></div>
            <div><dt>Areas</dt><dd>{FAMILY_ORDER.length}</dd></div>
            <div><dt>Teams</dt><dd>{companies.size}</dd></div>
          </dl>
        </div>
        <p className="skills-legend rv"><span className="tech-pill core legend-chip"><span className="tech-sym">Ng</span>Main</span> technologies I use most</p>
        <div className="stack-grid">
          {FAMILY_ORDER.map((f, i) => <Group key={f} fam={f} index={i} />)}
        </div>
      </div>
    </section>
  );
}

---
title: "Genetics"
statement: "Nature and Nurture"
icon: dna
domain: body
type: belief
weight: 6
date: 2026-08-02
edges:
  - target: temper
    relation: expresses
    note: COMT Met/Met — faster dopamine degradation under acute stress
  - target: gi-health-woes
    relation: echoes
    note: nine years of labs measured against themselves
  - target: enough
    relation: tension
    note: $400 of sequencing and 7,509 measurements is its own extreme
source: Site/Genetics.md
sourceModified: 2026-08-02T14:06:03.529Z
---

I had the means (~$400) to be able to get my Whole Genome Sequence done a few years ago. It was probably a net *negative* for my happiness, but it satisfied a lot of curiosity I had about my physiology. I hope more people are able to do this, which can help us begin to make sense about why people are different and the same and clarify more substantially the impact of nature and nurture on our health, personality, etc. The upside here is that we understand that success and failure are really out of our control; the downside is the we feel predestined to our fate and give up. See also, [[Free Will]].

# # What I Learned From Sequencing My Genome

*30× whole-genome sequencing · ~37,900 variants annotated · 7,509 measurements spanning 2017–2026 · pipeline built on bcftools, the NHGRI-EBI GWAS Catalog, gnomAD, and the PGS Catalog Calculator*

Most personal genome write-ups stop at the prediction. I have nine years of labs, daily metrics, and fitness benchmarks to grade the predictions against — so this is organized around what the genome got right, what it got wrong, and which kind of finding turned out to be worth anything.

Every genotype here was verified against the raw VCF: call quality, read depth, and **allele polarity**, one variant at a time. That last one matters more than it sounds. "Differs from the reference genome" is not "carries the risk allele," and at positions where the reference happens to hold the rarer allele the two invert. Risk alleles and effect directions were checked against the GWAS Catalog individually.

**This is my personal data, shared for general interest. It is not medical advice.**

---

## Where I actually stand (Polygenic Risk Scores)

| Trait                       | Score            | Percentile | Risk vs. average                |
| --------------------------- | ---------------- | ---------- | ------------------------------- |
| **Type 2 diabetes**         | z = +2.07        | **98th**   | ~2.5–3× — but **not expressed** |
| **Coronary artery disease** | z = +1.48        | **93rd**   | **~2.2×**                       |
| **BMI / adiposity**         | z = +2.13        | 98th       | Strong push upward              |
| **Lipoprotein(a)**          | z = +1.40        | 92nd       | **115 nmol/L** — borderline     |
| **Cholesterol absorption**  | ABCG8 homozygous | —          | **Over-absorber **              |
| **LDL cholesterol**         | —                | 38th       | Slightly favorable              |
| **Systolic blood pressure** | z = −2.32        | **0.9th**  | Strongly favorable              |

**How the multiples were derived.** For CAD I used the published effect size for the exact score I ran (PGS003727 is the multi-ancestry GPS<sub>Mult</sub>): **HR 1.73 per standard deviation** for incident CAD in UK Biobank. At 1.48 SD that's **~2.2×**. The same paper found the top 20% carried ~3× the middle quintile's risk. For T2D, published hazard ratios cluster at **1.6–1.8 per SD**, giving **~2.5–3×** at 2.07 SD, with onset about 2.7 years earlier.

**Three caveats bigger than the point estimates.** These are *relative*, not absolute — baseline lifetime T2D risk is already ~40%, and relative risks apply to incidence rates, so a 3× figure does not mean certainty. They assume log-linearity out to +2 SD, which is shakier in the tail. And favorable scores don't cancel unfavorable ones: my blood pressure genetics are excellent, but the CAD score already contains BP and lipid loci, so subtracting them again would double-count.

**One-line version:** the genome was accurate whenever it named a *mechanism* and nearly useless whenever it produced a *percentile*.

---

## 1. The scorecard

### Predictions that held

| Prediction                                         | Measured                                                                                                            | Verdict                                  |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| **BCO1** — poor beta-carotene → retinol conversion | Beta-carotene **463** (high); retinol **53.5** (mid-normal)                                                         | **Textbook**                             |
| **ABCG8** — cholesterol over-absorber              | Ezetimibe cut LDL **36%** vs. 18–20% typical                                                                        | **Confirmed by drug response**           |
| **Lp(a)** — genetically fixed for life             | Three draws / 22 months: **120, 117, 115 nmol/L**                                                                   | **Confirmed** — 4% spread                |
| **MTHFR** compound het — slow folate activation    | Homocysteine mean **9.2**, peak **12.2**, while B12 (490–723) and folate (20–24) are replete and MMA normal at 0.13 | **Expressed**                            |
| **SHBG** score, 85th percentile                    | Measured **54–75 nmol/L** — high                                                                                    | **Confirmed**                            |
| **IL6R** — reduced IL-6 signaling                  | hsCRP mean **0.26**, max 0.7, nine draws                                                                            | **Consistent**                           |
| **TMPRSS6 / TFRC / TFR2** — iron handling          | Ferritin mean **27**, often 10–22, hemoglobin normal                                                                | **Expressed** — depletion without anemia |

The MTHFR row is the subtle one: elevated homocysteine *while B12 and folate are replete* is the compound-heterozygote phenotype. Substrate isn't the bottleneck; the enzyme is.

### The prediction that hasn't come true

**Type 2 diabetes — 98th percentile, ~2.5–3× risk — is not currently expressed.**

| Marker | Values | Read |
|---|---|---|
| HbA1c | **4.9–5.5**, 11 draws over 5 years | Normal throughout |
| Fasting glucose | **80–95**, 18 draws | Normal throughout |
| Fasting insulin | **2.5–4.3** | Very low |
| **HOMA-IR** | **0.56–1.01** | Exceptional insulin sensitivity |

**The mechanism explains why.** The genetic risk was beta-cell-centric — reduced insulin *secretion* capacity — with the BMI genetics supplying the *demand* those cells must meet. Demand is the half behavior can reach, and it's being suppressed hard: weight at 159.8 lb from a 185 peak (−13 lb in 2026 alone), 12,000–18,000 steps daily, resting heart rate 47.6 and HRV 64, both best-in-series. Fasting insulin of 2.5–4.3 means the beta cells are meeting an easy load easily.

So the honest framing isn't "the score was wrong." A 2.5–3× relative risk describes a population, and the half of this mechanism that responds to behavior is currently winning. The vulnerability hasn't gone anywhere — beta-cell reserve isn't what HbA1c measures, and it declines with age — but the leverage was always on the demand side, and that's where the effort went.

### Two smaller lessons pointing the other way

**Vitamin D inverts the usual direction.** The genetics came back unremarkable — at NADSYN1 I'm homozygous for the *higher*-vitamin-D allele, both CYP2R1 variants are heterozygous and neutral, and the SEC23A genotype is simply the common one. But early measurements ran **24–33 ng/mL**, genuinely insufficient; supplementation brought it to 38–44. The genotype said "nothing special," the labs said "you're low." Measure it.

**Omega-3 shows genetics ruling itself out.** My level is 4.4, down from 6.6 — low. But FADS1 (rs174537, rs174575) is homozygous reference, so I'm *not* a poor ALA→EPA/DHA converter. While I am on a plant-based diet, I supplement with nearly 1g EPA/DHA per day.

### One finding the genome doesn't explain

White blood cells have sat at **2.8–4.3 (mean 3.3)** across 17 draws over five years, neutrophils 1,400–2,240, with hemoglobin and platelets normal throughout. Stable, isolated, mild leukopenia. Nothing in this genome accounts for it. A persistent finding with no genetic explanation is worth naming rather than omitting — a genome is one input, not a complete account of a person.

---

## 2. Where the genome earned its keep

Two findings did real work. Both name a mechanism rather than a probability.

### Cholesterol over-absorption → the right drug

**The genotype.** ABCG5/ABCG8 encode the transporter pair that pumps sterols back *out* of intestinal cells — the body's main brake on absorption. I'm homozygous non-reference across a run of ABCG8 variants, all clean calls at 21–35× with GQ 127: **rs6544713 C/C** (C allele → higher campesterol, β = +0.33, p = 3×10⁻³⁷), **rs4299376 T/T**, **rs4245791 T/T**, **rs4245789 A/A**, plus heterozygous **T400K** (rs4148217), a coding variant that reduces transporter efficiency.

**The phenotype.** A Boston Heart Cholesterol Balance test separates production from absorption:

| Marker | Value | Reference | Read |
|---|---|---|---|
| Beta-sitosterol | **218** | 115–155 | **High** |
| Campesterol | **187** | 170–230 | High-normal |
| Lathosterol | 105 | 85–125 | Mid-range |
| Desmosterol | 48 | 65–75 | Below range |
| **Balance score** | **0.5** | 0.2 ← absorber / producer → 1.1 | **Over-absorber** |

Absorption markers high, production markers unremarkable — and campesterol elevated exactly as rs6544713 predicted.

**The drug response.** Ezetimibe blocks NPC1L1, the transporter that pulls sterols *in* — the direct counterpart to the ABCG5/G8 pump. LDL went **107 → 68** in a single month (2026-02-27 → 2026-03-30), a **36% reduction**, with ApoB tracking 80 → 66. Ezetimibe monotherapy typically delivers 18–20%. My untreated LDL had ranged 90–121 across a decade, so 68 is well outside anything diet alone reached.

**Caveats.** The plant sterol markers are confounded by a vegan diet — beta-sitosterol and campesterol *come from plants*, so intake raises blood levels independent of absorption efficiency. Those markers reflect intake × efficiency. And the 107 → 68 comparison assumes diet held constant. Neither caveat touches the genotype or the drug response, which is why the three-way convergence survives even though any single line would be arguable.

### Beta-carotene → the right form of vitamin A

**BCO1 rs6564851 G/G** predicts poor conversion of plant beta-carotene into retinol (G raises circulating carotenoids, β = +0.15). Measured: beta-carotene **463**, markedly high; retinol **53.5**, mid-normal. Precursor pooling up while the product stays ordinary — the mechanism visible in a blood draw. Practically: carrots and sweet potatoes don't reliably meet my vitamin A needs.

---

## 3. Cardiovascular

| Finding                       | Result                                                                           | Direction                     |
| ----------------------------- | -------------------------------------------------------------------------------- | ----------------------------- |
| **APOE**                      | **ε3/ε3** (verified, MinDP 11)                                                   | Neutral — no ε4               |
| **Systolic BP score**         | z = −2.32 → **0.9th pct**                                                        | Strongly favorable            |
| **9p21 / CDKN2B-AS1**         | rs1333049 C/C, rs10757278 G/G (**2 risk copies each**); rs4977574, rs2891168 het | **Risk-increasing**           |
| **CAD score** (PGS003727)     | z = +1.48 → 93rd pct                                                             | Elevated (~2.2×)              |
| **Lp(a)**                     | **115 nmol/L** measured                                                          | Borderline                    |
| **LPA** rs10455872, rs3798220 | Both reference                                                                   | Neither major raising variant |
| **IL6R** rs2228145            | C/C                                                                              | Mildly protective             |
| **ApoB** (on ezetimibe)       | **66 mg/dL**                                                                     | Strong position               |

**9p21 is risk-increasing here** — the most replicated CAD locus in the world, and I carry two risk copies at rs1333049 and rs10757278 plus one each at rs4977574 and rs2891168. All eight calls in the region are high quality. It contributes to the elevated score rather than offsetting it.

**Lp(a) resolved by measurement.** The score said 92nd percentile but I carry neither established raising variant — a genuine disagreement. Three draws settled it at 115–120 nmol/L: above the <75 optimal range, below the ~125 threshold where Lp(a) drives treatment. Both signals were partly right, and a 92nd-percentile score sounds worse than 115 actually is. Since Lp(a) is essentially fixed for life, this is a test I never need to repeat.

**Where it stands.** ApoB at 66 is below the ~80 threshold and into range usually reserved for high-risk patients — the right place to be with 2.2× genetic risk and borderline Lp(a). The pre-treatment panel was also better than LDL-C implied: HDL 62, triglycerides 69, and small LDL-P already optimal at 246, meaning the elevated particle count was mostly larger, less atherogenic particles. Ongoing: ApoB annually, and a coronary calcium scan eventually — imaging the arteries beats any risk score, which is the whole reason 2.2× is a starting position rather than a conclusion.

---

## 4. Everything else

| Domain              | Finding                                                         | Practical read                                                                                                                                                                                                           |
| ------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Pharmacogenomic** | **CYP2C19 \*17/\*17** (no \*2/\*3) — ultra-rapid, ~4% of people | Standard PPI and escitalopram/citalopram doses run low. Also clopidogrel, voriconazole                                                                                                                                   |
|                     | **SLCO1B1 \*1/\*1** (rs4149056 T/T, MinDP 22)                   | Normal transporter — no elevated statin myopathy risk if one is ever added                                                                                                                                               |
|                     | **CYP1A2** rs762551 C/A — intermediate                          | Theophylline, clozapine, olanzapine, caffeine                                                                                                                                                                            |
| **Methylation**     | **MTHFR compound het** (C677T + A1298C)                         | Methylfolate over folic acid, methylcobalamin over cyanocobalamin, adequate B2. Homocysteine is the marker that matters — and mine runs high                                                                             |
|                     | **TCN2** het, **FUT2** het (partial secretor)                   | Minor B12 delivery / absorption effects                                                                                                                                                                                  |
|                     | **PEMT** rs7946 T/T                                             | Reduced-activity allele, but the *common* genotype — choline intake still worth attention                                                                                                                                |
| **Neuro**           | **COMT rs4680 A/A (Met/Met)**, ~19% of people                   | 3–4× lower enzyme activity; dopamine lingers in the prefrontal cortex. Better focus when calm, faster degradation under acute stress, higher pain sensitivity. Sleep and aerobic exercise carry more weight than average |
|                     | **DRD3** rs6280 het                                             | Real but too small to act on                                                                                                                                                                                             |
| **Iron**            | **TMPRSS6** het, **TFRC** het, **TFR2** hom-alt                 | Ferritin 10–22 with normal hemoglobin — worth addressing, especially on a plant-based diet                                                                                                                               |
| **Nutrition**       | **MCM6/LCT rs4988235 A/A**                                      | Lactase persistent — lifelong lactose tolerance                                                                                                                                                                          |
|                     | **ALDH2 rs671** reference                                       | No alcohol flush variant                                                                                                                                                                                                 |
|                     | **FADS1** homozygous reference                                  | Normal omega-3 conversion — low levels are dietary                                                                                                                                                                       |
| **Fitness**         | **ACTN3 rs1815739 C/T**                                         | One working copy of the "sprinter gene" — mixed power/endurance, genetically permissive of either                                                                                                                        |
|                     | **FOXO3 rs2802292 G/T**                                         | One copy of the longevity-associated allele                                                                                                                                                                              |
| **Nicotine**        | **CHRNA5 rs16969968 A/A** + **HYKK rs8034191 C/C**              | Two risk copies each at the strongest nicotine-dependence locus. Almost entirely *conditional on smoking*, near-inert otherwise — an unusually personal argument for never starting                                      |
| **Screened clear**  | **PTPN22 rs2476601 G/G**                                        | Zero copies of the R620W autoimmune risk allele. The reference genome holds the rarer allele here, so "homozygous alternate" is the ordinary genotype                                                                    |
|                     | **BRCA2 rs144848**                                              | A common polymorphism (N372H, 22% frequency), not a pathogenic variant. No BRCA2 loss-of-function present                                                                                                                |
|                     | **Vitamin D pathway**                                           | Unremarkable genetically — see §1                                                                                                                                                                                        |

**Not covered by short-read WGS,** worth requesting if it ever matters: CYP2D6 (codeine, many antidepressants — hard to call due to structural variation), VKORC1/CYP2C9 (warfarin), TPMT/NUDT15, DPYD, and HLA-B\*57:01/\*15:02/\*58:01.

---

## The honest summary

Out of ~37,900 annotated variants, four changed a decision: cardiovascular risk (now measured and treated), T2D risk (monitoring and training), MTHFR (supplement forms), and BCO1 (vitamin A sources). Pharmacogenomics is a conditional fifth — a note for a future prescriber.

The pattern in the scorecard is the real finding, and it's sharper than I expected. **Where the genome named a mechanism, it was right.** BCO1 predicted beta-carotene pooling at 463 with retinol unremarkable. ABCG8 predicted an ezetimibe response that came in at roughly double the textbook effect. MTHFR predicted homocysteine running high on replete B12 and folate. **Where it produced a percentile, the percentile was the least informative thing available** — 98th-percentile diabetes risk sits alongside a HOMA-IR of 0.6 and nine years of normal HbA1c.

That distinction is most of the skill. A high polygenic score is not a diagnosis, and measurements can contradict it for years. A mechanistic finding is not a curiosity, and it can change a prescription. Prediction hands you a number you can't act on; mechanism tells you which of two treatments will work.

The other lesson is methodological: verify allele polarity variant by variant. A pipeline that treats every non-reference genotype as a risk variant produces confident, well-formatted, plausible output that happens to be wrong, and nothing in the output reveals it. Be suspicious of any analysis — including your own — that never returns anything reassuring.

---

*Not medical advice. Genotypes verified against raw VCF calls (quality, depth, allele polarity). Risk allele directions from the NHGRI-EBI GWAS Catalog; frequencies from gnomAD; polygenic scores computed with the PGS Catalog Calculator against the HGDP+1kGP reference panel.*

**Effect-size sources:** CAD hazard ratios from [Patel et al., *Nature Medicine* 2023](https://www.nature.com/articles/s41591-023-02429-x) (GPS<sub>Mult</sub>, PGS003727). T2D hazard ratios from [Kim et al., *Scientific Reports* 2024](https://www.nature.com/articles/s41598-024-55313-0), [Ma et al., *Nature Communications* 2025](https://www.nature.com/articles/s41467-025-63546-4), and [Hu et al., *PMC* 2023](https://pmc.ncbi.nlm.nih.gov/articles/PMC10508788/). Polygenic score framing from [Khera et al., *Nature Genetics* 2018](https://www.nature.com/articles/s41588-018-0183-z).

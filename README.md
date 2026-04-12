<div align="center">

# Frequency Allocation Problem (FAP)

Résolution par programmation par contraintes du problème d'allocation de fréquences radio,
modélisé avec [PyCSP3](https://pycsp.org/) et le solveur ACE.

![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white)
![PyCSP3](https://img.shields.io/badge/PyCSP3-constraint%20programming-orange)
![Solver](https://img.shields.io/badge/Solver-ACE-6a0dad)

</div>

---

## Table des matières

- [Problème](#problème)
- [Structure du projet](#structure-du-projet)
- [Installation](#installation)
- [Utilisation](#utilisation)
  - [Modèle faisable](#modèle-faisable)
  - [Modèle optimisé](#modèle-optimisé)
- [Campagne expérimentale](#campagne-expérimentale)
- [Modélisation](#modélisation)
- [Référence](#référence)

---

## Problème

Le **Frequency Allocation Problem** consiste à assigner une fréquence à chaque transceiver d'un réseau cellulaire tout en minimisant les interférences.

Deux types de contraintes s'appliquent :

| Contrainte | Condition | Seuil minimal |
|---|---|---|
| **Intra-cellule** | Deux transceivers d'une même cellule | `|f_i - f_j| >= 16` |
| **Inter-cellules** | Deux transceivers de cellules différentes | `|f_i - f_j| >= distance[c1][c2]` |

L'**objectif** du modèle optimisé est de minimiser le nombre de fréquences distinctes utilisées, avec `maxFreq` comme critère de bris d'égalité.

---

## Structure du projet

```
fap-project/
├── data/
│   ├── fap.json              # Instance originale (25 cellules, 148 transceivers)
│   ├── fap_medium.json       # Sous-instance medium (15 cellules, 90 transceivers)
│   └── fap_small.json        # Sous-instance small  ( 8 cellules, 45 transceivers)
├── results/
│   ├── experiments.csv       # Résultats bruts de la campagne expérimentale
│   └── experiments.md        # Résultats au format Markdown
├── src/
│   ├── modelSansOptimisation.py   # Modèle faisable (recherche rapide)
│   ├── model.py                   # Modèle optimisé (minimisation)
│   └── run_experiments.py         # Campagne expérimentale automatique
├── requirements.txt
└── README.md
```

---

## Installation

```bash
git clone https://github.com/capigit/fap-project.git
cd fap-project
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

**Dépendances :** `pycsp3`, `ace`

---

## Utilisation

### Modèle faisable

Trouve rapidement une solution valide sans chercher l'optimum.

```bash
python3 src/modelSansOptimisation.py                          # instance originale
python3 src/modelSansOptimisation.py --data data/fap_small.json
```

Sortie :
- statut de résolution (`SAT` / `TIMEOUT` / `UNSAT`)
- `nbFreqDiff` : nombre de fréquences distinctes utilisées
- `maxFreq` : valeur maximale de fréquence assignée
- extrait des 20 premières fréquences

### Modèle optimisé

Minimise le nombre de fréquences distinctes utilisées (objectif combiné : `nbFreqDiff * (nbFreqs+1) + maxFreq`).

```bash
python3 src/model.py                          # instance originale
python3 src/model.py --data data/fap_medium.json
```

Sortie :
- statut (`OPTIMUM` / `SAT` / `TIMEOUT` / `UNSAT`)
- `nbFreqDiff` et `maxFreq` de la meilleure solution trouvée

---

## Campagne expérimentale

Lance automatiquement les deux modèles sur les trois jeux de données avec trois limites de temps (30 s, 60 s, 120 s), soit 18 expériences.

```bash
python3 src/run_experiments.py
```

Résultats générés dans `results/experiments.csv` et `results/experiments.md`.

---

## Modélisation

| Élément | Détail |
|---|---|
| Solveur | ACE (via PyCSP3) |
| Variables | `f[i]` ∈ `{0, …, nbFreqs-1}` — fréquence du transceiver `i` |
| Variables auxiliaires | `used[k]` ∈ `{0,1}` (modèle optimisé), `maxFreq` |
| Bris de symétrie | `f[0] == 0` (les deux modèles) ; `f[1] <= f[2]` (modèle optimisé) |
| Objectif | Minimiser `Sum(used) * (nbFreqs+1) + maxFreq` |

> Les fichiers `model.xml` et `modelSansOptimisation.xml` sont générés automatiquement par PyCSP3 lors de l'exécution.

---

## Référence

Pascal Van Hentenryck, Laurent Michel, Laurent Perron, Jean-Charles Régin.
*Constraint Programming in OPL.* PPDP, 1999.

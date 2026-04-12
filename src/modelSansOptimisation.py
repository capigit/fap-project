from pycsp3 import *
import json
import argparse

parser = argparse.ArgumentParser(description="FAP feasible model")
parser.add_argument("--data", default="data/fap.json", help="Path to JSON dataset")
args = parser.parse_args()

with open(args.data) as f:
    data = json.load(f)

nbCells = data["nbCells"]
nbFreqs = data["nbFreqs"]
nbTrans = data["nbTrans"]
distance = data["distance"]

n = sum(nbTrans)

f = VarArray(size=n, dom=range(nbFreqs))

cell_of = []
for i in range(nbCells):
    for _ in range(nbTrans[i]):
        cell_of.append(i)

cells = [[] for _ in range(nbCells)]
for i in range(n):
    cells[cell_of[i]].append(i)

for c in range(nbCells):
    idxs = cells[c]
    satisfy(
        abs(f[i] - f[j]) >= 16
        for i in idxs
        for j in idxs
        if i < j
    )

for c1 in range(nbCells):
    for c2 in range(c1 + 1, nbCells):
        d = distance[c1][c2]
        if d == 0:
            continue
        for i in cells[c1]:
            for j in cells[c2]:
                satisfy(abs(f[i] - f[j]) >= d)

satisfy(f[0] == 0)

solve(solver="ace")
st = status()

if st == SAT or st == OPTIMUM:
    print("Solution faisable trouvée")
    try:
        solution = values(f)
        nb_freq_diff = len(set(solution))
        max_freq = max(solution)
        print("nbFreqDiff =", nb_freq_diff)
        print("maxFreq =", max_freq)
        print("Extrait solution (20 premiers) :", solution[:20])
        print(f"status=SAT nbFreqDiff={nb_freq_diff} maxFreq={max_freq}")
    except AssertionError:
        print("Valeurs de solution indisponibles")
        print("status=SAT")
elif st == UNKNOWN:
    print("Timeout ou aucune solution trouvée")
    print("status=TIMEOUT")
elif st == UNSAT:
    print("Pas de solution")
    print("status=UNSAT")
else:
    print(f"Résultat non concluant: {st}")
    print("status=UNKNOWN")
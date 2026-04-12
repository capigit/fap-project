from pycsp3 import *
import json
import argparse

parser = argparse.ArgumentParser(description="FAP optimized model")
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
used = VarArray(size=nbFreqs, dom={0, 1})
maxFreq = Var(dom=range(nbFreqs))

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
satisfy(f[1] <= f[2])

satisfy((f[i] != k) | (used[k] == 1) for i in range(n) for k in range(nbFreqs))
satisfy(f[i] <= maxFreq for i in range(n))

weight = nbFreqs + 1
minimize(Sum(used) * weight + maxFreq)

result = solve(solver="ace")
st = status()

if result and (st == SAT or st == OPTIMUM):
    st_name = "OPTIMUM" if st == OPTIMUM else "SAT"
    print("Solution trouvée")
    solution = values(f)
    nb_freq_diff = sum(values(used))
    print("nbFreqDiff =", nb_freq_diff)
    print("maxFreq =", max(solution))
    print(f"status={st_name} nbFreqDiff={nb_freq_diff} maxFreq={max(solution)}")
else:
    if st == UNKNOWN:
        print("Timeout ou aucune solution trouvée")
        print("status=TIMEOUT")
    elif st == UNSAT:
        print("Aucune solution (UNSAT)")
        print("status=UNSAT")
    else:
        print(f"Résultat non concluant: {st}")
        print("status=UNKNOWN")
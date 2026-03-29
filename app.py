from flask import Flask, request, jsonify
import subprocess

app = Flask(__name__)

# =========================
# ⚙️ RUN C PROGRAM
# =========================
def run_c_program(node, shock):
    try:
        process = subprocess.Popen(
            ["integration/c_backend/simulation.exe"],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )

        input_data = f"{node} {shock} 30"   # default reduction = 30
        output, error = process.communicate(input_data)

        if error:
            print("C Error:", error)

        return output.strip()

    except Exception as e:
        print("Error running C:", e)
        return ""


# =========================
# 🔄 PARSE OUTPUT
# =========================
def parse_output(output):
    result = {}

    try:
        items = output.split(";")

        for item in items:
            name, value = item.split(":")
            result[name] = int(float(value))

    except Exception as e:
        print("Parsing error:", e)

    return result


# =========================
# 📊 METRICS
# =========================
def calculate_metrics(data):
    if not data:
        return {"avgSupply": 0, "totalGDP": 0}

    avg = sum(data.values()) / len(data)
    gdp = sum(data.values()) * 10

    return {
        "avgSupply": round(avg, 2),
        "totalGDP": gdp
    }


# =========================
# 🚨 ALERTS
# =========================
def generate_alerts(data):
    alerts = []

    for node, value in data.items():
        if value < 50:
            alerts.append(f"{node} supply critically low")
        elif value < 70:
            alerts.append(f"{node} under stress")

    if "Manufacturing" in data and data["Manufacturing"] < 60:
        alerts.append("Manufacturing sector at risk")

    return alerts


# =========================
# 🏗️ BUILD RESPONSE
# =========================
def build_response(parsed):
    nodes = {k: {"supply": v} for k, v in parsed.items()}

    return {
        "nodes": nodes,
        "metrics": calculate_metrics(parsed),
        "alerts": generate_alerts(parsed)
    }


# =========================
# 🚀 API
# =========================
@app.route('/simulate', methods=['POST'])
def simulate():
    data = request.json

    node = data.get("node")
    shock = data.get("shock")

    print(f"Request → {node}, {shock}")

    # STEP 1: Run C
    output = run_c_program(node, shock)

    print("C Output:", output)

    # STEP 2: Parse
    parsed = parse_output(output)

    # STEP 3: Build response
    response = build_response(parsed)

    return jsonify(response)


# =========================
# ▶️ RUN
# =========================
if __name__ == "__main__":
    app.run(debug=True)
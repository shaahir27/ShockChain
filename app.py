from flask import Flask, request, jsonify
import subprocess

app = Flask(__name__)

# =========================
# ⚙️ RUN C PROGRAM
# =========================
def run_c_program(country, resource, shock):
    try:
        process = subprocess.Popen(
            ["integration/c_backend/simulation.exe"],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )

        shock_clean = shock.replace(" ", "")
        resource_clean = resource.replace(" ", "")

        input_data = f"{country} {resource_clean} {shock_clean} 30"

        print("INPUT TO C:", input_data)

        output, error = process.communicate(input_data)

        if error:
            print("C Error:", error)

        print("RAW OUTPUT:", output)

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
# 🧠 HELPER (IMPORTANT 🔥)
# =========================
def split_node(node):
    parts = node.split("_")
    return {
        "country": parts[0],
        "resource": parts[1] if len(parts) > 1 else None
    }


# =========================
# 📊 METRICS
# =========================
def calculate_metrics(data):
    if not data:
        return {"avgSupply": 0, "totalGDP": 0, "riskLevel": "Low"}

    avg = sum(data.values()) / len(data)
    gdp = sum(data.values()) * 10

    if avg < 70:
        risk = "High"
    elif avg < 85:
        risk = "Medium"
    else:
        risk = "Low"

    return {
        "avgSupply": round(avg, 2),
        "totalGDP": gdp,
        "riskLevel": risk
    }


# =========================
# 🚨 ALERTS (CLEANED)
# =========================
def generate_alerts(data):
    alerts = []

    for node, value in data.items():
        info = split_node(node)
        country = info["country"]

        if value < 50:
            alerts.append(f"{country} supply critically low")
        elif value <= 70:
            alerts.append(f"{country} under stress")

    # Global alert
    if "USA" in data and data["USA"] < 75:
        alerts.append("Global economic slowdown risk")

    # Oil-specific alert
    for node in data:
        if "Oil" in node and data[node] < 75:
            alerts.append("Global oil supply disruption detected")

    return list(set(alerts))  # remove duplicates


# =========================
# 🧠 INSIGHTS (UPGRADED)
# =========================
def generate_insights(country, resource, parsed):
    insights = []

    insights.append(
        f"{resource} disruption in {country} is impacting global supply chains."
    )

    if parsed:
        worst = min(parsed, key=parsed.get)
        worst_info = split_node(worst)

        insights.append(f"Most affected region: {worst_info['country']}")

    return insights


# =========================
# 🏗️ BUILD RESPONSE (IMPROVED)
# =========================
def build_response(parsed, country, resource):
    
    nodes = {}

    for k, v in parsed.items():
        info = split_node(k)

        nodes[k] = {
            "country": info["country"],
            "resource": info["resource"],
            "supply": v
        }

    return {
        "nodes": nodes,
        "metrics": calculate_metrics(parsed),
        "alerts": generate_alerts(parsed),
        "insights": generate_insights(country, resource, parsed)
    }


# =========================
# 🚀 API
# =========================
@app.route('/simulate', methods=['POST'])
def simulate():
    data = request.json

    country = data.get("country")
    resource = data.get("resource")
    shock = data.get("shock")

    if not country or not resource or not shock:
        return jsonify({"error": "Missing required fields"}), 400

    print(f"Request → {country}, {resource}, {shock}")

    # STEP 1
    output = run_c_program(country, resource, shock)

    # STEP 2
    parsed = parse_output(output)

    if not parsed:
        return jsonify({
            "error": "Simulation failed",
            "debug_output": output
        }), 500

    # STEP 3
    response = build_response(parsed, country, resource)

    return jsonify(response)


# =========================
# ▶️ RUN
# =========================
if __name__ == "__main__":
    app.run(debug=True)
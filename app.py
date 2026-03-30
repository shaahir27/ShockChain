from flask import Flask, request, jsonify
import subprocess
import os
from flask import render_template

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TMPL_DIR = os.path.join(BASE_DIR, "Frontend", "templates")
STATIC_DIR = os.path.join(BASE_DIR, "Frontend", "static")

app = Flask(__name__, \
            template_folder=TMPL_DIR,
            static_folder=STATIC_DIR)

# =========================
# 🧹 CLEAN INPUT
# =========================
def clean(text):
    return text.strip() if text else ""


# =========================
# ⚙️ RUN C PROGRAM
# =========================
def run_c_program(country, resource, shock, reduction):

    try:
        exe_path = os.path.join(os.getcwd(), "integration", "c_backend", "simulation.exe")

        if not os.path.exists(exe_path):
            print("❌ simulation.exe not found at:", exe_path)
            return ""

        process = subprocess.Popen(
            [exe_path],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )

        input_data = f"{clean(country)} {clean(resource)} {clean(shock)} {reduction}\n"

        print("INPUT →", input_data)

        output, error = process.communicate(input_data, timeout=5)

        if error:
            print("C ERROR:", error)

        print("OUTPUT →", output)

        return output.strip()

    except subprocess.TimeoutExpired:
        process.kill()
        print("❌ C program timeout")
        return ""

    except Exception as e:
        print("❌ Error running C program:", e)
        return ""


# =========================
# 🔄 PARSE OUTPUT (UPDATED)
# =========================
def parse_output(output):
    result_nodes = {}
    history_array = []

    try:
        if not output or any(err in output for err in ["Error", "NodeNotFound", "Invalid"]):
            return {}, []

        # SPLIT the output at our new marker
        parts = output.split("HISTORY_START")
        
        # --- Handle Node Snapshots (Part 1) ---
        node_section = parts[0]
        items = node_section.strip(";").split(";")
        for item in items:
            p = item.split("|")
            if len(p) == 3:
                country, resource, value = p
                key = f"{country}_{resource}"
                result_nodes[key] = int(float(value))

        # --- Handle History Array (Part 2) ---
        if len(parts) > 1:
            history_str = parts[1].strip()
            # Convert "90.5,88.2,..." into [90.5, 88.2, ...]
            history_array = [float(x) for x in history_str.split(",") if x]

    except Exception as e:
        print("Parsing error:", e)

    return result_nodes, history_array


# =========================
# 🧠 SPLIT NODE
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
NODE_GDP_WEIGHTS = {
    "MiddleEast_Oil": 0.18,
    "India_Oil": 0.12,
    "India_Wheat": 0.08,
    "China_Oil": 0.14,
    "China_Manufacturing": 0.20,
    "USA_Tech": 0.22,
    "SouthKorea_Semiconductors": 0.14,
    "Vietnam_Manufacturing": 0.07,
}

def calculate_metrics(data):

    if not data:
        return {"avgSupply": 0, "totalGDP": 0, "riskLevel": "Low", "gdpImpact": 0, "affectedNodes": 0}

    avg = sum(data.values()) / len(data)
    gdp = sum(data.values()) * 10

    if avg < 70:
        risk = "High"
    elif avg < 85:
        risk = "Moderate"
    else:
        risk = "Low"

    # Weighted GDP impact
    gdp_impact = 0
    for node, supply in data.items():
        weight = NODE_GDP_WEIGHTS.get(node, 0.1)
        loss   = (100 - supply) / 100.0
        gdp_impact += loss * weight * 1000

    affected = sum(1 for v in data.values() if v < 80)

    return {
        "avgSupply": round(avg, 2),
        "totalGDP": gdp,
        "riskLevel": risk,
        "gdpImpact": round(gdp_impact),
        "affectedNodes": affected
    }


# =========================
# 🚨 ALERTS (GENERIC)
# =========================
def generate_alerts(data):

    alerts = []

    for node, value in data.items():
        info = split_node(node)

        if value < 50:
            alerts.append(f"{info['country']} {info['resource']} critically low")
        elif value <= 70:
            alerts.append(f"{info['country']} {info['resource']} under stress")

    if any(v < 75 for v in data.values()):
        alerts.append("Global economic slowdown risk")

    for node, val in data.items():
        info = split_node(node)
        if val < 75:
            alerts.append(f"{info['resource']} supply disruption detected")

    return list(set(alerts))


# =========================
# 🧠 INSIGHTS
# =========================
def generate_insights(country, resource, parsed):

    insights = []

    insights.append(
        f"{resource} shock in {country} triggered cascading global effects."
    )

    if parsed:
        worst = min(parsed, key=parsed.get)
        worst_info = split_node(worst)

        insights.append(f"Most affected region: {worst_info['country']} ({worst_info['resource']})")

    return insights


# =========================
# 🏗️ BUILD RESPONSE
# =========================
def build_response(parsed_nodes, history, country, resource):
    nodes = {}
    for k, v in parsed_nodes.items():
        info = split_node(k)
        nodes[k] = {
            "country": info["country"],
            "resource": info["resource"],
            "supply": v
        }

    return {
        "nodes": nodes,
        "history": history,  # <--- NEW: Sending the 90-day array to JS
        "metrics": calculate_metrics(parsed_nodes),
        "alerts": generate_alerts(parsed_nodes),
        "insights": generate_insights(country, resource, parsed_nodes)
    }

# =========================
# 🚀 API ROUTE
# =========================

@app.route('/')
def index():
    return render_template('index.html')


@app.route('/simulate', methods=['POST'])
def simulate():
    data = request.json or {}
    country = data.get("country")
    resource = data.get("resource")
    shock = data.get("shock")
    reduction = data.get("reduction", 30)

    # 🔵 INITIAL LOAD (Default 100% data)
    if not country or not resource or not shock:
        parsed_nodes = {
            "MiddleEast_Oil": 100, "India_Oil": 100, "India_Wheat": 100,
            "China_Manufacturing": 100, "USA_Tech": 100, "SouthKorea_Semiconductors": 100
        }
        history = [100] * 90 # Flat line for initial state
        return jsonify(build_response(parsed_nodes, history, "Global", "None"))

    # 🔴 RUN SIMULATION
    output = run_c_program(country, resource, shock, reduction)
    
    # Get both the nodes and the history array
    parsed_nodes, history = parse_output(output)

    if not parsed_nodes:
        return jsonify({"error": "Simulation failed"}), 400

    return jsonify(build_response(parsed_nodes, history, country, resource))


# =========================
# ▶️ RUN SERVER
# =========================
if __name__ == "__main__":
    app.run(debug=True)
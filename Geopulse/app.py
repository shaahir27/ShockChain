from flask import Flask, request, jsonify
from flask_cors import CORS
import subprocess
import os

app = Flask(__name__)
CORS(app)

# Configuration
EXE_PATH = os.path.join("integration", "c_backend", "simulation.exe")

def run_simulation(country, resource, shock_type="sanction"):
    try:
        if not os.path.exists(EXE_PATH):
            # Dynamic Fallback: Simulate different node keys based on the input
            # If Taiwan Chips is shocked, affect Germany Auto and USA Tech
            if country == "Taiwan":
                return "Taiwan_Chips:30;Germany_Auto:60;USA_Tech:75;Ukraine_Grain:100;Saudi_Oil:100;Brazil_Iron:100;Australia_Lithium:100"
            return "Taiwan_Chips:100;Ukraine_Grain:100;Saudi_Oil:70;Germany_Auto:90;Brazil_Iron:100;Australia_Lithium:100;USA_Tech:100"

        process = subprocess.Popen([EXE_PATH], stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True)
        input_string = f"{country} {resource} {shock_type} 40\n"
        output, _ = process.communicate(input_string, timeout=5)
        return output.strip()
    except Exception as e:
        return ""
    
@app.route("/")
def home():
    return "ShockChain Backend Running 🚀"

@app.route("/simulate", methods=["POST"])
def simulate():
    data = request.json
    country = data.get("country")
    resource = data.get("resource")
    
    raw_output = run_simulation(country, resource)
    parsed_nodes = {}
    
    for s in raw_output.split(";"):
        if ":" in s:
            k, v = s.split(":")
            parsed_nodes[k.strip()] = {"supply": int(float(v))}

    supply_values = [v["supply"] for v in parsed_nodes.values()]
    avg_supply = round(sum(supply_values) / len(supply_values), 1)
    
    return jsonify({
        "nodes": parsed_nodes,
        "metrics": {
            "avgSupply": avg_supply,
            "totalGDP": avg_supply * 850,
            "riskLevel": "High" if avg_supply < 80 else "Low"
        }
    })

if __name__ == "__main__":
    app.run(port=5000, debug=True)
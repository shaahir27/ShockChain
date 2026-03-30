#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>

#define MAX_NODES 50
#define NAME_LEN 50
#define SIM_DAYS 90

#ifdef _WIN32
#define strcasecmp _stricmp
#endif

// ---------------- NODE ----------------
typedef struct {
    char country[NAME_LEN];
    char resource[NAME_LEN];
    float supply;
} Node;

Node nodes[MAX_NODES] = {
    {"MiddleEast", "Oil", 100},
    {"India", "Oil", 100},
    {"India", "Wheat", 100},
    {"China", "Oil", 100},
    {"China", "Manufacturing", 100},
    {"USA", "Tech", 100},
    {"SouthKorea", "Semiconductors", 100},
    {"Vietnam", "Manufacturing", 100}
};

int node_count = 8;
int adj[MAX_NODES][MAX_NODES] = {0};

// ---------------- FIND NODE ----------------
int find_node(char *country, char *resource) {
    for(int i = 0; i < node_count; i++) {
        if(strcasecmp(nodes[i].country, country) == 0 &&
           strcasecmp(nodes[i].resource, resource) == 0)
            return i;
    }
    return -1;
}

// ---------------- INIT GRAPH ----------------
void init_graph() {

    // MiddleEast Oil → India Oil, China Oil
    adj[0][1] = 1;
    adj[0][3] = 1;

    // India Oil → India Wheat (cross-sector)
    adj[1][2] = 1;

    // China Oil → Manufacturing
    adj[3][4] = 1;

    // China Manufacturing → Vietnam Manufacturing
    adj[4][7] = 1;

    // South Korea → USA Tech
    adj[6][5] = 1;
}

// ---------------- SHOCK MULTIPLIER ----------------
float get_multiplier(char *shock_type) {

    if(strcasecmp(shock_type, "sanction") == 0)
        return 1.2;
    else if(strcasecmp(shock_type, "war") == 0)
        return 1.5;
    else if(strcasecmp(shock_type, "exportban") == 0)
        return 1.3;

    return 1.0;
}

// ---------------- SIMULATION ----------------
void simulate_90_days(int source, float reduction, char *shock_type) {
    float daily_supply[SIM_DAYS];
    float multiplier = get_multiplier(shock_type);
    
    // Calculate the initial impact depth
    float max_impact = reduction * multiplier;
    if (max_impact > 100) max_impact = 100;

    // Simulation Constants
    float recovery_rate = 0.05; // 5% recovery toward baseline per day
    float shock_delay = 5;      // Peak impact hits on day 5

    for (int day = 0; day < SIM_DAYS; day++) {
        if (day < shock_delay) {
            // Day 0-5: Supply drops linearly to the peak impact
            float drop_progress = (float)day / shock_delay;
            daily_supply[day] = 100 - (max_impact * drop_progress);
        } else {
            // Day 6-90: Gradual recovery using an exponential decay towards 100%
            int days_since_peak = day - (int)shock_delay;
            // Formula: Current = 100 - (Remaining_Impact * e^(-recovery_rate * time))
            daily_supply[day] = 100 - (max_impact * exp(-recovery_rate * days_since_peak));
        }
    }

    // --- UPDATED OUTPUT FORMAT ---
    // Part 1: Node State (Snapshot)
    for (int i = 0; i < node_count; i++) {
        // We use Day 5 (peak impact) for the node status dots
        float peak_impact = (i == source) ? max_impact : (max_impact * 0.4); 
        float remaining = 100 - peak_impact;
        if(remaining < 0) remaining = 0;
        
        printf("%s|%s|%.0f", nodes[i].country, nodes[i].resource, remaining);
        if(i != node_count - 1) printf(";");
    }

    // Part 2: Separator for the History Array
    printf("HISTORY_START");

    // Part 3: 90-Day Array (For the Line Chart)
    for (int d = 0; d < SIM_DAYS; d++) {
        printf("%.1f", daily_supply[d]);
        if (d != SIM_DAYS - 1) printf(",");
    }

    fflush(stdout);
}

// Main 

int main() {
    char country[NAME_LEN], resource[NAME_LEN], shock_type[NAME_LEN];
    float reduction;

    // Read input from Flask (stdin)
    if (scanf("%s %s %s %f", country, resource, shock_type, &reduction) != 4) return 1;

    init_graph();
    int source = find_node(country, resource);
    if (source == -1) return 1;

    // Run the new 90-day simulation
    simulate_90_days(source, reduction, shock_type);

    return 0;
}
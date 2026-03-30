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
    {"Saudi", "Oil", 100},
    {"Iran", "Oil", 100},
    {"Iraq", "Oil", 100},
    {"India", "Oil", 100},
    {"India", "Wheat", 100},
    {"China", "Oil", 100},
    {"China", "Manufacturing", 100},
    {"USA", "Tech", 100},
    {"SouthKorea", "Semiconductors", 100},
    {"Vietnam", "Manufacturing", 100},
    {"France", "Energy", 100},
    {"UK", "Finance", 100},
    {"Suez", "Trade", 100}
};

int node_count = 13;
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

    // Oil → Suez
    adj[0][12] = 1; // Saudi → Suez
    adj[1][12] = 1; // Iran → Suez
    adj[2][12] = 1; // Iraq → Suez

    // Suez → global
    adj[12][3] = 1; // → India Oil
    adj[12][5] = 1; // → China Oil
    adj[12][10] = 1; // → France

    // Downstream
    adj[3][4] = 1;  // India Oil → Wheat
    adj[5][6] = 1;  // China Oil → Manufacturing
    adj[6][9] = 1;  // China → Vietnam

    adj[8][7] = 1;  // Korea → USA Tech
    adj[10][11] = 1; // France → UK
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


float get_decay(char *shock_type) {
    if (strcasecmp(shock_type, "war") == 0) return 0.7;
    if (strcasecmp(shock_type, "sanction") == 0) return 0.5;
    if (strcasecmp(shock_type, "exportban") == 0) return 0.4;
    return 0.6; // oil default
}

// ---------------- SIMULATION ----------------
void simulate_90_days(int source, float reduction, char *shock_type) {
    float daily_supply[SIM_DAYS];
    float multiplier = get_multiplier(shock_type);
    
    // Calculate the initial impact depth
    float max_impact = reduction * multiplier;
    if (max_impact > 100) max_impact = 100;

    // 🔥 ADD THIS HERE
    float nodeImpact[MAX_NODES];
    for(int i = 0; i < node_count; i++) nodeImpact[i] = 0;

    float decay = get_decay(shock_type);

    // BFS
    int queue[MAX_NODES];
    float impact_queue[MAX_NODES];
    int front = 0, rear = 0;

    int visited[MAX_NODES] = {0};

    queue[rear] = source;
    impact_queue[rear] = max_impact;
    rear++;

    while(front < rear) {
        int current = queue[front];
        float impact = impact_queue[front];
        front++;

        if (visited[current]) continue;
        visited[current] = 1;

        char *res = nodes[current].resource;

        // 🔥 SANCTION FILTER
        if (strcasecmp(shock_type, "sanction") == 0) {
            if (strcasecmp(res, "Tech") != 0 &&
                strcasecmp(res, "Semiconductors") != 0 &&
                strcasecmp(res, "Manufacturing") != 0) {
                continue;
            }
        }

        // 🔥 EXPORT BAN FILTER
        if (strcasecmp(shock_type, "exportban") == 0) {
            if (impact < 40) continue;
        }

        if(impact < 15) continue;

        if(impact > nodeImpact[current])
            nodeImpact[current] = impact;

        for(int j = 0; j < node_count; j++) {
            if(adj[current][j]) {
                if (rear < MAX_NODES) {
                    queue[rear] = j;
                    impact_queue[rear] = impact * decay;
                    rear++;
                }
            }
        }
    }

    float avgImpact = 0;
    for(int i = 0; i < node_count; i++) {
        avgImpact += nodeImpact[i];
    }
    avgImpact /= node_count;

    // Simulation Constants
    float recovery_rate = 0.05; // 5% recovery toward baseline per day
    float shock_delay = 5;      // Peak impact hits on day 5

    for (int day = 0; day < SIM_DAYS; day++) {
        if (day < shock_delay) {
            // Day 0-5: Supply drops linearly to the peak impact
            float drop_progress = (float)day / shock_delay;
            daily_supply[day] = 100 - (avgImpact * drop_progress);
        } else {
            // Day 6-90: Gradual recovery using an exponential decay towards 100%
            int days_since_peak = day - (int)shock_delay;
            // Formula: Current = 100 - (Remaining_Impact * e^(-recovery_rate * time))
            daily_supply[day] = 100 - (avgImpact * exp(-recovery_rate * days_since_peak));
        }
    }

    // --- UPDATED OUTPUT FORMAT ---
    // Part 1: Node State (Snapshot)
    for (int i = 0; i < node_count; i++) {
        // We use Day 5 (peak impact) for the node status dots
        float remaining = 100 - nodeImpact[i];
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
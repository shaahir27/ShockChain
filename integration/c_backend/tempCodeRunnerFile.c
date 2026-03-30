#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define MAX_NODES 50
#define NAME_LEN 50

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
void simulate(int source, float reduction, char *shock_type) {

    float impact[MAX_NODES] = {0};
    int visited[MAX_NODES] = {0};

    int queue[MAX_NODES];
    int front = 0, rear = 0;

    float multiplier = get_multiplier(shock_type);

    impact[source] = reduction;
    queue[rear++] = source;
    visited[source] = 1;

    while(front < rear) {

        int curr = queue[front++];

        for(int i = 0; i < node_count; i++) {

            if(adj[curr][i] > 0) {

                float transfer = impact[curr] * 0.6 * multiplier;

                // decay
                transfer *= 0.85;

                if(impact[i] < transfer)
                    impact[i] = transfer;

                if(impact[i] > 100)
                    impact[i] = 100;

                if(!visited[i]) {
                    queue[rear++] = i;
                    visited[i] = 1;
                }
            }
        }
    }

    // ---------------- OUTPUT ----------------
    for(int i = 0; i < node_count; i++) {

        float remaining = nodes[i].supply - impact[i];
        if(remaining < 0) remaining = 0;

        printf("%s|%s|%.0f", nodes[i].country, nodes[i].resource, remaining);

        if(i != node_count - 1)
            printf(";");
    }

    fflush(stdout);
}

// ---------------- MAIN ----------------
int main() {

    char country[NAME_LEN];
    char resource[NAME_LEN];
    char shock_type[NAME_LEN];
    float reduction;

    // Input from frontend
    if(scanf("%s %s %s %f", country, resource, shock_type, &reduction) != 4) {
        printf("InvalidInput");
        return 1;
    }

    if(reduction < 0 || reduction > 100) {
        printf("InvalidReduction");
        return 1;
    }

    init_graph();

    int source = find_node(country, resource);

    if(source == -1) {
        printf("NodeNotFound");
        return 1;
    }

    simulate(source, reduction, shock_type);

    return 0;
}